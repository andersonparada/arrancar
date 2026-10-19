/**
 * Prueba de integración contra PostgreSQL (base de pruebas): el historial fiscal de la empresa. La seguridad por
 * filas (por empresa), los `check` de coherencia de cada régimen, la unicidad de las vigencias y el repositorio
 * (la vigencia de un período, el bloqueo y escribir).
 */
import { DatabaseError } from 'pg';
import pg from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { configuracion } from '../../../../configuracion.js';
import { bd, grupoConexiones } from '../../../core/base-datos/conexion.js';
import { migrarModulos } from '../../../core/base-datos/migrador.js';
import type { ContextoEmpresa } from '../../../core/compartido/aplicacion/contexto-empresa.js';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import { cuentas } from '../../../core/cuentas/infraestructura/persistencia/cuentas.tablas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import { definicionesModulos } from '../../../indice.js';
import { DatosFiscalesDeEmpresa } from '../../dominio/datos-fiscales-de-empresa.js';
import { RepositorioDeDatosFiscalesDeEmpresaDrizzle } from './repositorio-de-datos-fiscales-de-empresa.drizzle.js';
import { datosFiscalesDeEmpresa } from './datos-fiscales.tablas.js';

let usuarioId: string;
let cuentaA: string;
let cuentaB: string;
let empresaA1: string;
let empresaA2: string;
let empresaB: string;

const en = (empresaId: string, cuentaId: string): ContextoEmpresa => ({ empresaId, cuentaId, usuarioId });

/** La restricción que rechazó la operación: Drizzle envuelve el error de PostgreSQL en sus causas. */
async function restriccionQueViola(operacion: Promise<unknown>): Promise<string | undefined> {
  try {
    await operacion;
  } catch (error) {
    for (let actual = error; actual; actual = (actual as { cause?: unknown }).cause) {
      if (actual instanceof DatabaseError) return actual.constraint;
    }
  }
  return undefined;
}

beforeAll(async () => {
  await migrarModulos(configuracion.DATABASE_URL_PROPIETARIO!, definicionesModulos);
  const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await conexion.connect();
  await conexion.query('truncate core.cuentas, core.usuarios cascade');
  await conexion.end();
  const [a, b] = await bd
    .insert(cuentas)
    .values([{ nombre: 'Cuenta A' }, { nombre: 'Cuenta B' }])
    .returning();
  const [usuario] = await bd
    .insert(usuarios)
    .values({ usuario: 'fiscalesempresa', nombres: 'Fiscales', hashContrasena: 'x' })
    .returning();
  const filas = await bd
    .insert(empresas)
    .values([
      { cuentaId: a!.id, nombre: 'Empresa A1' },
      { cuentaId: a!.id, nombre: 'Empresa A2' },
      { cuentaId: b!.id, nombre: 'Empresa B' },
    ])
    .returning();
  usuarioId = usuario!.id;
  [cuentaA, cuentaB] = [a!.id, b!.id];
  [empresaA1, empresaA2, empresaB] = filas.map((fila) => fila.id) as [string, string, string];
});

afterAll(async () => {
  await grupoConexiones.end();
});

/** Una vigencia fiscal válida (jurídica, régimen general, la base) que cada prueba cambia a su gusto. */
const vigencia = (empresaId: string, cambios: Record<string, unknown> = {}) => ({
  empresaId,
  vigenteDesde: null,
  tipoDePersona: 'juridica',
  regimenIva: 'general',
  regimenIsr: 'utilidades',
  agenteDeRetencionIva: 'ninguno',
  esAgenteDeRetencionIsr: true,
  ...cambios,
});

const insertar = (empresaId: string, cuentaId: string, valores: ReturnType<typeof vigencia>) =>
  enTransaccionSegura(en(empresaId, cuentaId), (tx) => tx.insert(datosFiscalesDeEmpresa).values(valores));

async function vaciarVigencias(): Promise<void> {
  for (const [empresaId, cuentaId] of [
    [empresaA1, cuentaA],
    [empresaA2, cuentaA],
    [empresaB, cuentaB],
  ] as const) {
    await enTransaccionSegura(en(empresaId, cuentaId), (tx) => tx.delete(datosFiscalesDeEmpresa));
  }
}

describe('datos fiscales de la empresa: seguridad por empresa', () => {
  beforeEach(vaciarVigencias);

  it('cada empresa ve solo los suyos, aunque sea de la misma cuenta', async () => {
    await insertar(empresaA1, cuentaA, vigencia(empresaA1, { agenteDeRetencionIva: 'exportador' }));
    const visibles = (empresaId: string, cuentaId: string) =>
      enTransaccionSegura(en(empresaId, cuentaId), (tx) => tx.select().from(datosFiscalesDeEmpresa));

    expect(await visibles(empresaA1, cuentaA)).toHaveLength(1);
    expect(await visibles(empresaA2, cuentaA)).toEqual([]);
    expect(await visibles(empresaB, cuentaB)).toEqual([]);
  });

  it('no se puede escribir en los de otra empresa, ni siquiera de la misma cuenta', async () => {
    const intento = insertar(empresaA2, cuentaA, vigencia(empresaA1));

    await expect(intento).rejects.toThrow();
  });

  it('otra empresa no puede cambiar ni borrar una vigencia', async () => {
    await insertar(empresaA1, cuentaA, vigencia(empresaA1));
    const desdeOtra = en(empresaA2, cuentaA);

    const cambiadas = await enTransaccionSegura(desdeOtra, (tx) =>
      tx.update(datosFiscalesDeEmpresa).set({ esAgenteDeRetencionIsr: false }).returning(),
    );
    const borradas = await enTransaccionSegura(desdeOtra, (tx) => tx.delete(datosFiscalesDeEmpresa).returning());

    expect([cambiadas, borradas]).toEqual([[], []]);
  });
});

describe('datos fiscales de la empresa: reglas de la base', () => {
  beforeEach(vaciarVigencias);

  const sinIsr = { regimenIsr: null, esAgenteDeRetencionIsr: false };
  const casosQueViolan: Array<[string, string, Record<string, unknown>]> = [
    ['regimen_iva', 'un régimen de IVA que no existe', { regimenIva: 'inventado', ...sinIsr }],
    ['regimen_isr', 'un régimen de ISR que no existe', { regimenIsr: 'inventado' }],
    ['tipo_de_persona', 'un tipo de persona que no existe', { tipoDePersona: 'sociedad' }],
    ['agente_de_iva', 'un agente de IVA que no existe', { agenteDeRetencionIva: 'inventado' }],
    [
      'agente_de_iva_solo_general',
      'agente de IVA en pequeño contribuyente',
      { regimenIva: 'pequeno_contribuyente', ...sinIsr, agenteDeRetencionIva: 'otro' },
    ],
    [
      'agente_de_iva_solo_general',
      'agente de IVA en no afiliado',
      { regimenIva: 'no_afiliado', regimenIsr: 'exento', agenteDeRetencionIva: 'exportador' },
    ],
    ['regimen_isr_segun_iva', 'ISR nulo en el régimen general', { regimenIsr: null }],
    ['regimen_isr_segun_iva', 'ISR nulo en no afiliado', { regimenIva: 'no_afiliado', regimenIsr: null }],
    [
      'regimen_isr_segun_iva',
      'ISR con valor en primario y pecuario',
      { regimenIva: 'primario_pecuario', regimenIsr: 'utilidades' },
    ],
    [
      'agropecuario_individual',
      'agropecuario persona jurídica',
      { regimenIva: 'contribuyente_agropecuario', ...sinIsr, tipoDePersona: 'juridica' },
    ],
    ['exento_solo_juridica', 'exento en persona individual', { regimenIsr: 'exento', tipoDePersona: 'individual' }],
    ['vigente_desde_primer_dia', 'una vigencia que empieza el día 2', { vigenteDesde: '2026-11-02' }],
  ];

  it.each(casosQueViolan)('%s: rechaza %s', async (restriccion, _caso, cambios) => {
    const intento = insertar(empresaA1, cuentaA, vigencia(empresaA1, cambios));

    expect(await restriccionQueViola(intento)).toBe(`datos_fiscales_de_empresa_${restriccion}`);
  });

  it.each([
    ['no afiliado exento', { regimenIva: 'no_afiliado', regimenIsr: 'exento' }],
    ['no afiliado individual sobre utilidades', { regimenIva: 'no_afiliado', tipoDePersona: 'individual' }],
    ['primario y pecuario individual', { regimenIva: 'primario_pecuario', ...sinIsr, tipoDePersona: 'individual' }],
    ['primario y pecuario jurídica', { regimenIva: 'primario_pecuario', ...sinIsr }],
    ['pequeño contribuyente electrónico', { regimenIva: 'pequeno_contribuyente_electronico', ...sinIsr }],
    ['agropecuario individual', { regimenIva: 'contribuyente_agropecuario', ...sinIsr, tipoDePersona: 'individual' }],
    ['general con agente de IVA', { agenteDeRetencionIva: 'contribuyente_especial' }],
    ['vigencia el día 1', { vigenteDesde: '2026-11-01' }],
  ])('acepta %s', async (_caso, cambios) => {
    await insertar(empresaA1, cuentaA, vigencia(empresaA1, cambios));

    const filas = await enTransaccionSegura(en(empresaA1, cuentaA), (tx) => tx.select().from(datosFiscalesDeEmpresa));
    expect(filas).toHaveLength(1);
  });

  it('el tipo de persona no tiene valor por omisión: la base lo exige', async () => {
    const { tipoDePersona: _omitido, ...sinPersona } = vigencia(empresaA1);

    const intento = enTransaccionSegura(en(empresaA1, cuentaA), (tx) =>
      tx.insert(datosFiscalesDeEmpresa).values(sinPersona as ReturnType<typeof vigencia>),
    );

    await expect(intento).rejects.toThrow();
  });

  it('una empresa no puede tener dos bases ni dos vigencias del mismo mes', async () => {
    await insertar(empresaA1, cuentaA, vigencia(empresaA1));
    await insertar(empresaA1, cuentaA, vigencia(empresaA1, { vigenteDesde: '2026-11-01' }));

    const otraBase = insertar(
      empresaA1,
      cuentaA,
      vigencia(empresaA1, { regimenIva: 'no_afiliado', regimenIsr: 'exento' }),
    );
    const otroNoviembre = insertar(empresaA1, cuentaA, vigencia(empresaA1, { vigenteDesde: '2026-11-01' }));

    expect(await restriccionQueViola(otraBase)).toBe('datos_fiscales_de_empresa_vigencia_unica');
    expect(await restriccionQueViola(otroNoviembre)).toBe('datos_fiscales_de_empresa_vigencia_unica');
  });

  it('la base de otra empresa no choca', async () => {
    await insertar(empresaA1, cuentaA, vigencia(empresaA1));
    await insertar(empresaA2, cuentaA, vigencia(empresaA2));
    await insertar(empresaB, cuentaB, vigencia(empresaB));

    const cuantas = await enTransaccionSegura(en(empresaA2, cuentaA), (tx) => tx.select().from(datosFiscalesDeEmpresa));

    expect(cuantas).toHaveLength(1);
  });
});

describe('el repositorio del historial fiscal', () => {
  const repositorio = new RepositorioDeDatosFiscalesDeEmpresaDrizzle();
  const pequeno = { regimenIva: 'pequeno_contribuyente', regimenIsr: null };

  beforeEach(vaciarVigencias);

  const vigenteEn = (periodo: string, empresaId = empresaA1, cuentaId = cuentaA) =>
    enTransaccionSegura(en(empresaId, cuentaId), async () => {
      const datos = await repositorio.vigenteEn(empresaId, periodo);
      return datos?.instantanea().regimenIva ?? null;
    });

  it('una empresa sin filas no tiene datos de ningún período', async () => {
    expect(await vigenteEn('2026-10-01')).toBeNull();
  });

  it('solo con la base, rige en cualquier período', async () => {
    await insertar(empresaA1, cuentaA, vigencia(empresaA1));

    expect([await vigenteEn('1990-01-01'), await vigenteEn('2040-12-01')]).toEqual(['general', 'general']);
  });

  it('con base y noviembre: octubre es de la base; noviembre y diciembre, de noviembre', async () => {
    await insertar(empresaA1, cuentaA, vigencia(empresaA1));
    await insertar(empresaA1, cuentaA, vigencia(empresaA1, { ...pequeno, vigenteDesde: '2026-11-01' }));

    expect(await vigenteEn('2026-10-01')).toBe('general');
    expect(await vigenteEn('2026-11-01')).toBe('pequeno_contribuyente');
    expect(await vigenteEn('2026-12-01')).toBe('pequeno_contribuyente');
  });

  it('un cambio programado a futuro no rige todavía', async () => {
    await insertar(empresaA1, cuentaA, vigencia(empresaA1));
    await insertar(empresaA1, cuentaA, vigencia(empresaA1, { ...pequeno, vigenteDesde: '2030-01-01' }));

    expect(await vigenteEn('2026-10-01')).toBe('general');
  });

  it('otra empresa no ve el historial ni la vigencia', async () => {
    await insertar(empresaA1, cuentaA, vigencia(empresaA1));

    const historial = await enTransaccionSegura(en(empresaA2, cuentaA), () => repositorio.historial(empresaA1));

    expect(historial.estaVacio()).toBe(true);
    expect(await vigenteEn('2026-10-01', empresaA2)).toBeNull();
  });

  it('lee el historial con sus ids, inserta, actualiza y elimina', async () => {
    const contexto = en(empresaA1, cuentaA);
    const general = DatosFiscalesDeEmpresa.porOmision();
    const individual = general.conTipoDePersona('individual');

    await enTransaccionSegura(contexto, () =>
      repositorio.insertar(empresaA1, { id: null, vigenteDesde: null, datos: general }),
    );
    const [base] = (await enTransaccionSegura(contexto, () => repositorio.historial(empresaA1))).vigencias();
    await enTransaccionSegura(contexto, () => repositorio.actualizar({ ...base!, datos: individual }));
    const actualizado = await enTransaccionSegura(contexto, () => repositorio.historial(empresaA1));
    await enTransaccionSegura(contexto, () => repositorio.eliminar(base!.id!));
    const vacio = await enTransaccionSegura(contexto, () => repositorio.historial(empresaA1));

    expect(base?.id).toEqual(expect.any(String));
    expect(actualizado.vigencias()[0]?.datos.instantanea().tipoDePersona).toBe('individual');
    expect(vacio.estaVacio()).toBe(true);
  });

  it('bloquear, en cualquier modo, no falla con o sin filas', async () => {
    await enTransaccionSegura(en(empresaA1, cuentaA), () => repositorio.bloquear(empresaA1, 'actualizar'));
    await insertar(empresaA1, cuentaA, vigencia(empresaA1));

    const bloqueos = enTransaccionSegura(en(empresaA1, cuentaA), async () => {
      await repositorio.bloquear(empresaA1, 'actualizar');
      await repositorio.bloquear(empresaA1, 'compartir');
    });

    await expect(bloqueos).resolves.toBeUndefined();
  });
});
