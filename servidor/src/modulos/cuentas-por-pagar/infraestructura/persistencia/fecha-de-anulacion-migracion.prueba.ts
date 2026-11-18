/**
 * La migración 0011 (CP5-1) llena `fecha_de_anulacion` de lo que ya estaba anulado. Se prueba con las sentencias reales
 * del archivo SQL: dentro de una transacción que se deshace se quitan los checks nuevos, se siembra lo anulado a la
 * antigua y se corre el relleno.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../../../../configuracion.js';
import { grupoConexiones } from '../../../core/base-datos/conexion.js';
import { contextoDe, prepararEscenario, type Escenario } from './escenario.soporte.js';
import { prepararBancos } from './movimientos-de-bancos.soporte.js';

const SQL_DE_LA_MIGRACION = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'migraciones',
  '0011_cp5_fecha_de_anulacion.sql',
);

/** Las sentencias del relleno (los `UPDATE`) tal como están en la migración. */
const sentencias = readFileSync(SQL_DE_LA_MIGRACION, 'utf8')
  .split('--> statement-breakpoint')
  .map((s) => s.trim());
const relleno = sentencias.filter((s) => /^(--.*\n)*UPDATE /.test(s));

let e: Escenario;
let nuevoMovimiento: () => Promise<string>;
let conexion: pg.Client;
let numero = 100;

const un = async (consulta: string, parametros: unknown[] = []) => (await conexion.query(consulta, parametros)).rows[0];
const fechaDe = async (tabla: string, id: string): Promise<string> =>
  (await un(`select fecha_de_anulacion::text as f from cuentas_por_pagar.${tabla} where id = $1`, [id])).f;

/** Un cheque anulado a la antigua en Bancos (sin inverso). */
async function chequeAnulado(): Promise<string> {
  const id = await nuevoMovimiento();
  await un(`update bancos.movimientos set anulado_en = now(), motivo_de_anulacion = 'x' where id = $1`, [id]);
  return id;
}

/** Un cheque revertido: su inverso es de otra fecha. */
async function chequeRevertido(fechaDelInverso: string): Promise<string> {
  const id = await nuevoMovimiento();
  await un(
    `insert into bancos.movimientos (empresa_id, cuenta_bancaria_id, tipo, fecha, monto, concepto_id, referencia, revierte_a_id)
     select empresa_id, cuenta_bancaria_id, 'credito', $2, monto, concepto_id, 'INV', id from bancos.movimientos where id = $1`,
    [id, fechaDelInverso],
  );
  await un(`update bancos.movimientos set revertido_en = now(), motivo_de_reversion = 'x' where id = $1`, [id]);
  return id;
}

const anulacion = (anuladoEn = 'now()') => `'anulado', ${anuladoEn}, '${e.usuarioId}', 'Error'`;

interface OpcionesDePago {
  movimientoId: string | null;
  anuladoEn?: string;
  /** Ya llena: el relleno no la toca. */
  fechaYaLlena?: string;
}

async function pago(forma: string, { movimientoId, anuladoEn, fechaYaLlena }: OpcionesDePago): Promise<string> {
  const extra = fechaYaLlena ? `, '${fechaYaLlena}'` : '';
  numero += 1;
  const apertura = forma === 'cuenta_de_apertura' ? ", 'Cheque anterior', false" : ', null, null';
  return (
    await un(
      `insert into cuentas_por_pagar.pagos (empresa_id, proveedor_id, numero, forma, fecha, monto, movimiento_id,
         estado, anulado_en, anulado_por, motivo_de_anulacion, motivo, con_carga_cerrada ${extra ? ', fecha_de_anulacion' : ''})
       values ($1, $2, $3, $4, '2026-03-15', 100, $5, ${anulacion(anuladoEn)}${apertura} ${extra}) returning id`,
      [e.empresaA1, e.proveedorA, numero, forma, movimientoId],
    )
  ).id;
}

async function reintegro(forma: string, movimientoId: string | null): Promise<string> {
  numero += 1;
  const referencia = forma === 'efectivo' ? "'Recibo 1'" : 'null';
  return (
    await un(
      `insert into cuentas_por_pagar.reintegros (empresa_id, proveedor_id, numero, forma, fecha, monto, movimiento_id,
         referencia, estado, anulado_en, anulado_por, motivo_de_anulacion)
       values ($1, $2, $3, $4, '2026-03-15', 100, $5, ${referencia}, ${anulacion("'2026-06-11 03:00+00'")}) returning id`,
      [e.empresaA1, e.proveedorA, numero, forma, movimientoId],
    )
  ).id;
}

async function retiro(movimientoId: string): Promise<string> {
  numero += 1;
  return (
    await un(
      `insert into cuentas_por_pagar.retiros_de_efectivo (empresa_id, numero, forma, fecha, monto, movimiento_id, custodio,
         estado, anulado_en, anulado_por, motivo_de_anulacion)
       values ($1, $2, 'cheque', '2026-03-15', 1000, $3, 'Juan', ${anulacion()}) returning id`,
      [e.empresaA1, numero, movimientoId],
    )
  ).id;
}

beforeAll(async () => {
  e = await prepararEscenario('cuentasporpagarfechaanulacion');
  nuevoMovimiento = await prepararBancos(contextoDe(e, e.empresaA1, e.cuentaA));
  conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await conexion.connect();
});

afterAll(async () => {
  await conexion.end();
  await grupoConexiones.end();
});

describe('migración 0011: relleno de la fecha de anulación', () => {
  it('tiene un relleno por tabla, antes de los checks', () => {
    const posicion = (texto: string) => sentencias.findIndex((s) => s.includes(texto));

    expect(relleno).toHaveLength(3);
    expect(posicion('UPDATE "cuentas_por_pagar"."retiros_de_efectivo"')).toBeLessThan(
      posicion('pagos_fecha_de_anulacion_de_su_estado'),
    );
  });

  it('llena según cómo se anuló, solo lo que falta, y repetirlo no cambia nada', async () => {
    await conexion.query('begin');
    try {
      for (const tabla of ['pagos', 'reintegros', 'retiros_de_efectivo']) {
        await conexion.query(
          `alter table cuentas_por_pagar.${tabla} drop constraint ${tabla === 'retiros_de_efectivo' ? 'retiros' : tabla}_fecha_de_anulacion_de_su_estado`,
        );
      }
      const ids = {
        antigua: await pago('cheque', { movimientoId: await chequeAnulado() }),
        inverso: await pago('nota_de_debito', { movimientoId: await chequeRevertido('2026-04-20') }),
        apertura: await pago('cuenta_de_apertura', { movimientoId: null, anuladoEn: "'2026-06-11 03:00+00'" }),
        anteriorAlPago: await pago('cuenta_de_apertura', { movimientoId: null, anuladoEn: "'2026-02-01 12:00+00'" }),
        nota: await pago('nota_ligada', { movimientoId: await nuevoMovimiento(), anuladoEn: "'2026-06-11 03:00+00'" }),
        yaLlena: await pago('cheque', { movimientoId: await chequeAnulado(), fechaYaLlena: '2026-05-05' }),
        depositoRevertido: await reintegro('deposito', await chequeRevertido('2026-04-21')),
        efectivo: await reintegro('efectivo', null),
        retiroAntiguo: await retiro(await chequeAnulado()),
        retiroRevertido: await retiro(await chequeRevertido('2026-04-22')),
      };

      for (const vez of [1, 2]) {
        for (const sentencia of relleno) await conexion.query(sentencia);
        expect(await fechaDe('pagos', ids.antigua), `vez ${vez}`).toBe('2026-03-15');
        expect(await fechaDe('pagos', ids.inverso)).toBe('2026-04-20');
        expect(await fechaDe('pagos', ids.apertura)).toBe('2026-06-10');
        expect(await fechaDe('pagos', ids.anteriorAlPago)).toBe('2026-03-15');
        expect(await fechaDe('pagos', ids.nota)).toBe('2026-06-10');
        expect(await fechaDe('pagos', ids.yaLlena)).toBe('2026-05-05');
        expect(await fechaDe('reintegros', ids.depositoRevertido)).toBe('2026-04-21');
        expect(await fechaDe('reintegros', ids.efectivo)).toBe('2026-06-10');
        expect(await fechaDe('retiros_de_efectivo', ids.retiroAntiguo)).toBe('2026-03-15');
        expect(await fechaDe('retiros_de_efectivo', ids.retiroRevertido)).toBe('2026-04-22');
      }
    } finally {
      await conexion.query('rollback');
    }
  });

  it('la migración completa deja las columnas, los checks y el índice', async () => {
    const { rows } = await conexion.query(
      `select conname from pg_constraint
       where conname like '%_fecha_de_anulacion_%'
         and connamespace = 'cuentas_por_pagar'::regnamespace
       order by conname`,
    );
    const indice = await conexion.query(`select 1 from pg_indexes
       where schemaname = 'cuentas_por_pagar' and indexname = 'pagos_anulados_corte_idx'`);

    expect(rows.map((r) => r.conname)).toEqual([
      'pagos_fecha_de_anulacion_de_su_estado',
      'pagos_fecha_de_anulacion_valida',
      'reintegros_fecha_de_anulacion_de_su_estado',
      'reintegros_fecha_de_anulacion_valida',
      'retiros_fecha_de_anulacion_de_su_estado',
      'retiros_fecha_de_anulacion_valida',
    ]);
    expect(indice.rowCount).toBe(1);
  });
});
