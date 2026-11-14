import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { conceptoDeSistema, conceptoGeneral, crearCuentaBancaria } from './soporte/escenarios-de-bancos.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const MIGRACION = new URL('../modulos/bancos/migraciones/0032_cp4_pagos_de_cuentas_por_pagar.sql', import.meta.url);
const CLAVES_NUEVAS = ['pago_a_proveedor_de_activo', 'reintegro_de_proveedor', 'reintegro_de_proveedor_de_activo'];
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let otra: CuentaDePrueba;
let movimientoId = '';
let conceptoA = '';
let conceptoB = '';

const insertar = (monto: string, conceptoId: string, empresaId = cuenta.empresaId) =>
  comoPropietario(
    `insert into bancos.desglose_de_movimientos (empresa_id, movimiento_id, concepto_id, monto)
     values ($1, $2, $3, $4)`,
    [empresaId, movimientoId, conceptoId, monto],
  );

const lineas = () =>
  comoPropietario<{ monto: string }>(
    'select monto from bancos.desglose_de_movimientos where movimiento_id = $1 order by monto',
    [movimientoId],
  );

async function registrarNota(): Promise<string> {
  const cuentaBancariaId = await crearCuentaBancaria(cuenta.propietario, 'Desglose tabla');
  const creada = await cuenta.propietario.post('/api/bancos/notas', {
    cuentaBancariaId,
    tipo: 'debito',
    fecha: '2026-02-10',
    monto: '100.00',
    referencia: null,
    beneficiario: null,
    observaciones: null,
    conceptoId: await conceptoGeneral(cuenta.propietario),
  });
  return creada.cuerpo.id as string;
}

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Tabla', usuario: 'propietariotabla', modulos: ['bancos'] });
  otra = await darDeAltaCuenta(entorno, { nombre: 'Otra', usuario: 'propietariootra', modulos: ['bancos'] });
  movimientoId = await registrarNota();
  conceptoA = (await conceptoDeSistema(cuenta.propietario, 'pago_a_proveedor')).id;
  conceptoB = (await conceptoDeSistema(cuenta.propietario, 'pago_a_proveedor_de_activo')).id;
});

describe('tabla bancos.desglose_de_movimientos', () => {
  it('guarda varias líneas por movimiento, una por concepto, con monto positivo', async () => {
    await insertar('60.00', conceptoA);
    await insertar('40.00', conceptoB);

    expect(await lineas()).toEqual([{ monto: '40.00' }, { monto: '60.00' }]);
    await expect(insertar('10.00', conceptoA)).rejects.toThrow(/desglose_de_movimientos_concepto_unico/);
    await expect(insertar('0.00', conceptoA)).rejects.toThrow(/desglose_de_movimientos_monto_positivo/);
  });

  it('no admite el concepto de otra empresa', async () => {
    const ajeno = (await conceptoDeSistema(otra.propietario, 'pago_a_proveedor')).id;

    await expect(insertar('5.00', ajeno)).rejects.toThrow(/desglose_de_movimientos_concepto_de_la_empresa_fk/);
  });

  it('la seguridad por empresa oculta las líneas a la aplicación de otra empresa', async () => {
    const filas = await comoPropietario<{ visibles: number }>(
      `select count(*)::int as visibles from bancos.desglose_de_movimientos where empresa_id = $1`,
      [otra.empresaId],
    );
    const politicas = await comoPropietario<{ politicas: number }>(
      `select count(*)::int as politicas from pg_policies
       where schemaname = 'bancos' and tablename = 'desglose_de_movimientos'`,
      [],
    );

    expect(filas[0]!.visibles).toBe(0);
    expect(politicas[0]!.politicas).toBe(1);
    const rls = await comoPropietario<{ activa: boolean }>(
      `select relrowsecurity as activa from pg_class where oid = 'bancos.desglose_de_movimientos'::regclass`,
      [],
    );
    expect(rls[0]!.activa).toBe(true);
  });

  it('al borrar el movimiento se van sus líneas', async () => {
    await comoPropietario('delete from bancos.movimientos where id = $1', [movimientoId]);

    expect(await lineas()).toEqual([]);
  });
});

describe('migración 0032: conceptos de sistema de CP4', () => {
  it('las empresas con catálogo los reciben, también quien ya tenía uno con ese nombre, y repetirla no duplica', async () => {
    await comoPropietario(
      `update bancos.conceptos set clave_de_sistema = null, nombre = 'reintegro de proveedores'
       where empresa_id = $1 and clave_de_sistema = 'reintegro_de_proveedor'`,
      [cuenta.empresaId],
    );
    await comoPropietario(
      `delete from bancos.conceptos where empresa_id = $1 and clave_de_sistema = 'pago_a_proveedor_de_activo'`,
      [cuenta.empresaId],
    );
    const sql = readFileSync(MIGRACION, 'utf8');
    const soloConceptos = sql.slice(sql.indexOf('UPDATE "bancos"."conceptos"'));

    await comoPropietario(soloConceptos, []);
    await comoPropietario(soloConceptos, []);

    const claves = await comoPropietario<{ clave_de_sistema: string; nombre: string }>(
      `select clave_de_sistema, nombre from bancos.conceptos
       where empresa_id = $1 and clave_de_sistema = any($2) order by clave_de_sistema`,
      [cuenta.empresaId, CLAVES_NUEVAS],
    );
    expect(claves.map((c) => c.clave_de_sistema)).toEqual(CLAVES_NUEVAS);
    expect(claves.find((c) => c.clave_de_sistema === 'reintegro_de_proveedor')!.nombre).toBe(
      'reintegro de proveedores',
    );
  });
});
