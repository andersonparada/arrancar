/**
 * Prueba de integración contra PostgreSQL (base de pruebas): seguridad por empresa de los combustibles y sus
 * vigencias, la llave compuesta con la empresa, los `check` y la exclusión de vigencias que se traslapan.
 */
import { eq } from 'drizzle-orm';
import pg, { DatabaseError } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../../../../configuracion.js';
import { bd, grupoConexiones } from '../../../core/base-datos/conexion.js';
import { migrarModulos } from '../../../core/base-datos/migrador.js';
import type { ContextoEmpresa } from '../../../core/compartido/aplicacion/contexto-empresa.js';
import { RecursoEnUso } from '../../../core/compartido/aplicacion/errores.js';
import { ReglaDeNegocioInfringida } from '../../../core/compartido/dominio/errores.js';
import { interpretarErrorDePostgres } from '../../../core/compartido/infraestructura/errores-de-postgres.js';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import { cuentas } from '../../../core/cuentas/infraestructura/persistencia/cuentas.tablas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import { definicionesModulos } from '../../../indice.js';
import { combustibles } from './combustibles.tablas.js';
import { vigenciasDeCombustible } from './vigencias-de-combustible.tablas.js';

let usuarioId: string;
let cuentaA: string;
let cuentaB: string;
let empresaA1: string;
let empresaA2: string;
let empresaB: string;
let gasolinaA1: string;
let dieselA1: string;

const en = (empresaId: string, cuentaId: string): ContextoEmpresa => ({ empresaId, cuentaId, usuarioId });
const enA1 = () => en(empresaA1, cuentaA);

/** El error de PostgreSQL de la causa: Drizzle envuelve el original en sus propias excepciones. */
async function errorDePostgres(operacion: Promise<unknown>): Promise<DatabaseError | undefined> {
  try {
    await operacion;
  } catch (error) {
    for (let actual = error; actual; actual = (actual as { cause?: unknown }).cause) {
      if (actual instanceof DatabaseError) return actual;
    }
  }
  return undefined;
}

async function vaciarComoPropietario(): Promise<void> {
  const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await conexion.connect();
  await conexion.query('truncate core.cuentas, core.usuarios cascade');
  await conexion.end();
}

async function crearCombustible(contexto: ContextoEmpresa, nombre: string): Promise<string> {
  const [fila] = await enTransaccionSegura(contexto, (tx) =>
    tx.insert(combustibles).values({ empresaId: contexto.empresaId, nombre }).returning(),
  );
  return fila!.id;
}

const vigencia = (combustibleId: string, cambios: Record<string, unknown> = {}) => ({
  empresaId: empresaA1,
  combustibleId,
  idpPorGalon: '4.70',
  vigenteDesde: '2026-01-01',
  vigenteHasta: '2026-03-31',
  ...cambios,
});

const insertarVigencia = (valores: ReturnType<typeof vigencia>, contexto = enA1()) =>
  enTransaccionSegura(contexto, (tx) => tx.insert(vigenciasDeCombustible).values(valores));

beforeAll(async () => {
  await migrarModulos(configuracion.DATABASE_URL_PROPIETARIO!, definicionesModulos);
  await vaciarComoPropietario();
  const [a, b] = await bd
    .insert(cuentas)
    .values([{ nombre: 'Cuenta A' }, { nombre: 'Cuenta B' }])
    .returning();
  const [usuario] = await bd
    .insert(usuarios)
    .values({ usuario: 'combustibles', nombres: 'Combustibles', hashContrasena: 'x' })
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
  gasolinaA1 = await crearCombustible(enA1(), 'Gasolina');
  dieselA1 = await crearCombustible(enA1(), 'Diésel');
});

afterAll(async () => {
  await grupoConexiones.end();
});

describe('combustibles: seguridad por empresa y restricciones', () => {
  it('cada empresa ve solo los suyos, aunque sea de la misma cuenta', async () => {
    const visibles = (empresaId: string, cuentaId: string) =>
      enTransaccionSegura(en(empresaId, cuentaId), (tx) => tx.select().from(combustibles));

    expect(await visibles(empresaA1, cuentaA)).toHaveLength(2);
    expect(await visibles(empresaA2, cuentaA)).toEqual([]);
    expect(await visibles(empresaB, cuentaB)).toEqual([]);
  });

  it('el nombre no se repite en la empresa, pero otra empresa puede usarlo', async () => {
    const repetido = await errorDePostgres(crearCombustible(enA1(), 'Gasolina'));

    expect(repetido?.constraint).toBe('combustibles_nombre_unico');
    await expect(crearCombustible(en(empresaA2, cuentaA), 'Gasolina')).resolves.toBeTruthy();
  });

  it('el nombre repetido se reconoce sin mayúsculas, acentos ni espacios de más', async () => {
    const repetido = await errorDePostgres(crearCombustible(enA1(), '  GASOLÍNA '));

    expect(repetido?.constraint).toBe('combustibles_nombre_unico');
  });

  it('el nombre no puede quedar vacío ni pasar de 80 letras (check)', async () => {
    const vacio = await errorDePostgres(crearCombustible(enA1(), '   '));
    const largo = await errorDePostgres(crearCombustible(enA1(), 'x'.repeat(81)));

    expect(vacio?.constraint).toBe('combustibles_nombre_largo');
    expect(largo?.constraint).toBe('combustibles_nombre_largo');
  });
});

describe('vigencias de combustible: seguridad y llaves', () => {
  it('cada empresa ve solo las suyas', async () => {
    await insertarVigencia(vigencia(gasolinaA1));

    const visibles = (empresaId: string, cuentaId: string) =>
      enTransaccionSegura(en(empresaId, cuentaId), (tx) => tx.select().from(vigenciasDeCombustible));

    expect(await visibles(empresaA1, cuentaA)).toHaveLength(1);
    expect(await visibles(empresaA2, cuentaA)).toEqual([]);
    expect(await visibles(empresaB, cuentaB)).toEqual([]);
  });

  it('no se puede escribir en otra empresa ni apuntar al combustible de otra (llave compuesta)', async () => {
    const enOtraEmpresa = insertarVigencia(vigencia(gasolinaA1), en(empresaA2, cuentaA));
    const combustibleAjeno = insertarVigencia(
      vigencia(gasolinaA1, { empresaId: empresaA2, vigenteDesde: '2040-01-01', vigenteHasta: '2040-12-31' }),
      en(empresaA2, cuentaA),
    );

    await expect(enOtraEmpresa).rejects.toThrow();
    expect((await errorDePostgres(combustibleAjeno))?.constraint).toBe('vigencias_de_combustible_combustible_fk');
  });

  it('un combustible con vigencias no se elimina', async () => {
    const intento = enTransaccionSegura(enA1(), (tx) => tx.delete(combustibles).where(eq(combustibles.id, gasolinaA1)));

    const error = await errorDePostgres(intento);
    expect(error?.code).toBe('23503');
    expect(interpretarErrorDePostgres(error)).toBeInstanceOf(RecursoEnUso);
  });

  it.each([
    ['tasa negativa', { idpPorGalon: '-0.01' }, 'vigencias_de_combustible_idp_no_negativo'],
    ['etanol sobre 100', { porcentajeDeEtanol: '100.01', vigenteDesde: '2030-01-01' }, 'etanol_valido'],
    ['cierre anterior al inicio', { vigenteDesde: '2030-02-01', vigenteHasta: '2030-01-31' }, 'fechas_ordenadas'],
  ])('rechaza %s (check)', async (_caso, cambios, restriccion) => {
    const error = await errorDePostgres(insertarVigencia(vigencia(dieselA1, cambios)));

    expect(error?.constraint).toContain(restriccion);
  });

  it('la tasa cero es válida (exención temporal)', async () => {
    await expect(
      insertarVigencia(
        vigencia(dieselA1, { idpPorGalon: '0', vigenteDesde: '2025-01-01', vigenteHasta: '2025-12-31' }),
      ),
    ).resolves.toBeDefined();
  });
});

describe('vigencias de combustible: sin traslapes', () => {
  it('una vigencia que se traslapa con otra del mismo combustible se rechaza y se interpreta', async () => {
    const error = await errorDePostgres(
      insertarVigencia(vigencia(gasolinaA1, { vigenteDesde: '2026-03-31', vigenteHasta: '2026-06-30' })),
    );

    expect(error?.code).toBe('23P01');
    expect(error?.constraint).toBe('vigencias_de_combustible_sin_traslape');
    expect(interpretarErrorDePostgres(error)).toBeInstanceOf(ReglaDeNegocioInfringida);
    expect(interpretarErrorDePostgres(error)?.message).toBe('Esa vigencia se traslapa con otra del mismo combustible.');
  });

  it('la vigencia siguiente empieza el día después del cierre (los extremos cuentan)', async () => {
    await expect(
      insertarVigencia(vigencia(gasolinaA1, { vigenteDesde: '2026-04-01', vigenteHasta: null })),
    ).resolves.toBeDefined();
  });

  it('una abierta traslapa con cualquier posterior, y solo hay una abierta por combustible', async () => {
    const otraAbierta = await errorDePostgres(
      insertarVigencia(vigencia(gasolinaA1, { vigenteDesde: '2027-01-01', vigenteHasta: null })),
    );
    const posterior = await errorDePostgres(
      insertarVigencia(vigencia(gasolinaA1, { vigenteDesde: '2027-01-01', vigenteHasta: '2027-12-31' })),
    );

    expect(otraAbierta?.code).toBe('23P01');
    expect(posterior?.code).toBe('23P01');
  });

  it('otro combustible puede tener las mismas fechas', async () => {
    await expect(
      insertarVigencia(vigencia(dieselA1, { vigenteDesde: '2026-02-01', vigenteHasta: '2026-02-28' })),
    ).resolves.toBeDefined();
  });
});
