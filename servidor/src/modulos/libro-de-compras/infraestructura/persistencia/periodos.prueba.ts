/**
 * Prueba de integración contra PostgreSQL (base de pruebas): los períodos y su historial de declaraciones. Seguridad por
 * empresa, `check`, llave foránea y que el historial solo se agregue.
 */
import { and, eq } from 'drizzle-orm';
import pg, { DatabaseError } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../../../../configuracion.js';
import { bd, grupoConexiones } from '../../../core/base-datos/conexion.js';
import { migrarModulos } from '../../../core/base-datos/migrador.js';
import type { ContextoEmpresa } from '../../../core/compartido/aplicacion/contexto-empresa.js';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import { cuentas } from '../../../core/cuentas/infraestructura/persistencia/cuentas.tablas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import { definicionesModulos } from '../../../indice.js';
import { declaracionesDePeriodos, periodos } from './periodos.tablas.js';

let usuarioId: string;
let cuentaA: string;
let empresaA1: string;
let empresaA2: string;

const en = (empresaId: string): ContextoEmpresa => ({ empresaId, cuentaId: cuentaA, usuarioId });

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

const abrir = (empresaId: string, periodo = '2026-09-01') =>
  enTransaccionSegura(en(empresaId), (tx) => tx.insert(periodos).values({ empresaId, periodo }));

const FOTO = { version: 1, tipoDeLibro: 'completo', documentos: 0, huella: 'a'.repeat(64), resumen: {} };

const declaracion = (empresaId: string, cambios: Record<string, unknown> = {}) => ({
  empresaId,
  periodo: '2026-09-01',
  secuencia: 1,
  evento: 'declaracion' as const,
  formulario: 'SAT-2237' as const,
  numeroDeFormulario: '8841',
  fechaDePresentacion: '2026-10-12',
  tipoDeLibro: 'completo' as const,
  foto: FOTO,
  ...cambios,
});

const agregar = (empresaId: string, cambios: Record<string, unknown> = {}) =>
  enTransaccionSegura(en(empresaId), (tx) =>
    tx.insert(declaracionesDePeriodos).values(declaracion(empresaId, cambios)),
  );

const historialDe = (empresaId: string) =>
  enTransaccionSegura(en(empresaId), (tx) => tx.select().from(declaracionesDePeriodos));

beforeAll(async () => {
  await migrarModulos(configuracion.DATABASE_URL_PROPIETARIO!, definicionesModulos);
  const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await conexion.connect();
  await conexion.query('truncate core.cuentas, core.usuarios cascade');
  await conexion.end();
  const [cuenta] = await bd.insert(cuentas).values({ nombre: 'Cuenta períodos' }).returning();
  const [usuario] = await bd
    .insert(usuarios)
    .values({ usuario: 'periodos', nombres: 'Períodos', hashContrasena: 'x' })
    .returning();
  const filas = await bd
    .insert(empresas)
    .values([
      { cuentaId: cuenta!.id, nombre: 'Empresa 1' },
      { cuentaId: cuenta!.id, nombre: 'Empresa 2' },
    ])
    .returning();
  cuentaA = cuenta!.id;
  usuarioId = usuario!.id;
  [empresaA1, empresaA2] = filas.map((fila) => fila.id) as [string, string];
});

afterAll(async () => {
  await grupoConexiones.end();
});

describe('periodos', () => {
  it('guarda un período abierto y solo su empresa lo ve; la otra no puede escribir en el de la primera', async () => {
    await abrir(empresaA1);

    const deA1 = await enTransaccionSegura(en(empresaA1), (tx) => tx.select().from(periodos));
    const deA2 = await enTransaccionSegura(en(empresaA2), (tx) => tx.select().from(periodos));
    const ajena = await errorDePostgres(
      enTransaccionSegura(en(empresaA2), (tx) =>
        tx.insert(periodos).values({ empresaId: empresaA1, periodo: '2026-07-01' }),
      ),
    );

    expect(deA1).toHaveLength(1);
    expect(deA2).toEqual([]);
    expect(ajena?.code).toBe('42501');
  });

  it('cada check rechaza su caso', async () => {
    const constraint = async (cambios: Record<string, unknown>) =>
      (
        await errorDePostgres(
          enTransaccionSegura(en(empresaA1), (tx) =>
            tx.insert(periodos).values({ empresaId: empresaA1, periodo: '2026-06-01', ...cambios }),
          ),
        )
      )?.constraint;

    expect(await constraint({ periodo: '2026-06-15' })).toBe('periodos_primer_dia_del_mes');
    expect(await constraint({ estado: 'cerrado' })).toBe('periodos_estado_valido');
    expect(await constraint({ estado: 'declarado' })).toBe('periodos_declarado_completo');
    expect(await constraint({ declaradoEn: new Date(), declaradoPor: usuarioId })).toBe('periodos_declarado_completo');
  });

  it('el período es único por empresa, pero otra empresa puede tener el mismo mes', async () => {
    const repetido = await errorDePostgres(abrir(empresaA1));

    expect(repetido?.constraint).toBe('periodos_empresa_id_periodo_pk');
    await expect(abrir(empresaA2)).resolves.toBeTruthy();
  });
});

describe('declaraciones_de_periodos: restricciones', () => {
  it('guarda una declaración y solo su empresa la ve', async () => {
    await agregar(empresaA1);

    expect(await historialDe(empresaA1)).toHaveLength(1);
    expect(await historialDe(empresaA2)).toEqual([]);
  });

  it('exige que el período exista y que la secuencia no se repita', async () => {
    const sinPeriodo = await errorDePostgres(agregar(empresaA1, { periodo: '2026-05-01' }));
    const repetida = await errorDePostgres(agregar(empresaA1));

    expect(sinPeriodo?.constraint).toBe('declaraciones_de_periodos_periodo_fk');
    expect(repetida?.constraint).toBe('declaraciones_de_periodos_secuencia_unica');
  });

  it('una empresa no puede agregar a otra', async () => {
    const ajena = await errorDePostgres(
      enTransaccionSegura(en(empresaA2), (tx) =>
        tx.insert(declaracionesDePeriodos).values(declaracion(empresaA1, { secuencia: 9 })),
      ),
    );

    expect(ajena?.code).toBe('42501');
  });

  it('cada check rechaza su caso', async () => {
    const constraint = async (cambios: Record<string, unknown>) =>
      (await errorDePostgres(agregar(empresaA1, { secuencia: 5, ...cambios })))?.constraint;

    expect(await constraint({ evento: 'otro' })).toBe('declaraciones_de_periodos_evento_valido');
    expect(await constraint({ formulario: 'SAT-9999' })).toBe('declaraciones_de_periodos_formulario_valido');
    expect(await constraint({ numeroDeFormulario: '12 34' })).toBe('declaraciones_de_periodos_numero_valido');
    expect(await constraint({ formulario: 'sin_formulario' })).toBe('declaraciones_de_periodos_numero_valido');
    expect(await constraint({ tipoDeLibro: 'otro' })).toBe('declaraciones_de_periodos_tipo_valido');
    expect(await constraint({ foto: null })).toBe('declaraciones_de_periodos_declaracion_completa');
    expect(await constraint({ motivo: '' })).toBe('declaraciones_de_periodos_motivo_valido');
    expect(await constraint({ diferencia: { cambios: [] } })).toBe(
      'declaraciones_de_periodos_diferencia_solo_en_rectificacion',
    );
    expect(await constraint({ evento: 'rectificacion' })).toBe(
      'declaraciones_de_periodos_diferencia_solo_en_rectificacion',
    );
  });

  it('la reapertura lleva motivo y no lleva formulario ni foto', async () => {
    const reapertura = { evento: 'reapertura', formulario: null, numeroDeFormulario: null, tipoDeLibro: null };
    const sinMotivo = await errorDePostgres(agregar(empresaA1, { secuencia: 6, ...reapertura, foto: null }));
    const conFoto = await errorDePostgres(agregar(empresaA1, { secuencia: 7, ...reapertura, motivo: 'Falta una' }));

    expect(sinMotivo?.constraint).toBe('declaraciones_de_periodos_reapertura_con_motivo');
    expect(conFoto?.constraint).toBe('declaraciones_de_periodos_reapertura_con_motivo');
    await expect(
      agregar(empresaA1, { secuencia: 8, ...reapertura, foto: null, fechaDePresentacion: null, motivo: 'Falta una' }),
    ).resolves.toBeTruthy();
  });

  it('la rectificación lleva su diferencia', async () => {
    const rectificacion = { secuencia: 9, evento: 'rectificacion', diferencia: { cambios: [] } };

    await expect(agregar(empresaA1, rectificacion)).resolves.toBeTruthy();
  });
});

describe('declaraciones_de_periodos: historial de solo agregar', () => {
  it('cambiar o borrar una declaración no toca ninguna fila', async () => {
    const antes = await historialDe(empresaA1);
    const cambiadas = await enTransaccionSegura(en(empresaA1), (tx) =>
      tx
        .update(declaracionesDePeriodos)
        .set({ numeroDeFormulario: 'CAMBIADO' })
        .where(eq(declaracionesDePeriodos.empresaId, empresaA1))
        .returning(),
    );
    const borradas = await enTransaccionSegura(en(empresaA1), (tx) =>
      tx.delete(declaracionesDePeriodos).where(eq(declaracionesDePeriodos.empresaId, empresaA1)).returning(),
    );

    expect(cambiadas).toEqual([]);
    expect(borradas).toEqual([]);
    expect(await historialDe(empresaA1)).toEqual(antes);
  });

  it('un período con historial no se puede borrar', async () => {
    const error = await errorDePostgres(
      enTransaccionSegura(en(empresaA1), (tx) =>
        tx.delete(periodos).where(and(eq(periodos.empresaId, empresaA1), eq(periodos.periodo, '2026-09-01'))),
      ),
    );

    expect(error?.constraint).toBe('declaraciones_de_periodos_periodo_fk');
  });
});
