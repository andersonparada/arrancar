import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { conceptoDeSistema, crearCuentaBancaria } from './soporte/escenarios-de-bancos.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const MIGRACION = new URL('../modulos/bancos/migraciones/0036_caja_chica_y_cuentas_por_liquidar.sql', import.meta.url);
const CLAVES_NUEVAS = [
  'anticipo_no_liquidado',
  'anticipo_por_liquidar',
  'devolucion_de_anticipo',
  'devolucion_de_fondo_de_caja_chica',
  'fondo_de_caja_chica',
  'gasto_de_anticipo',
  'gasto_de_anticipo_de_activo',
  'reintegro_de_caja_chica',
  'reintegro_de_caja_chica_de_activo',
];
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;

const clasificacion = (clave: string) =>
  comoPropietario<Record<string, string | null>>(
    `select clave_de_sistema, nombre, aplica_a, actividad_de_flujo, grupo_de_flujo from bancos.conceptos
     where empresa_id = $1 and clave_de_sistema = $2`,
    [cuenta.empresaId, clave],
  );

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, {
    nombre: 'Conceptos de caja chica',
    usuario: 'propietariocajachica',
    modulos: ['bancos'],
  });
  await conceptoDeSistema(cuenta.propietario, 'pago_a_proveedor');
});

describe('migración 0036: conceptos de sistema de Caja chica y Cuentas por liquidar', () => {
  it('la clave se pone al sugerido del mismo nombre, se inserta lo que falta y repetirla no duplica', async () => {
    await comoPropietario(
      `update bancos.conceptos set clave_de_sistema = null, nombre = 'fondo de CAJA chica'
       where empresa_id = $1 and clave_de_sistema = 'fondo_de_caja_chica'`,
      [cuenta.empresaId],
    );
    await comoPropietario(`delete from bancos.conceptos where empresa_id = $1 and clave_de_sistema = any($2)`, [
      cuenta.empresaId,
      ['anticipo_por_liquidar', 'devolucion_de_anticipo'],
    ]);
    const sql = readFileSync(MIGRACION, 'utf8');

    await comoPropietario(sql.replaceAll('--> statement-breakpoint', ''), []);
    await comoPropietario(sql.replaceAll('--> statement-breakpoint', ''), []);

    const filas = await comoPropietario<Record<string, string | null>>(
      `select clave_de_sistema, aplica_a, actividad_de_flujo, grupo_de_flujo from bancos.conceptos
       where empresa_id = $1 and clave_de_sistema = any($2) order by clave_de_sistema`,
      [cuenta.empresaId, CLAVES_NUEVAS],
    );
    expect(filas.map((f) => f.clave_de_sistema)).toEqual(CLAVES_NUEVAS);
    expect(filas.map((f) => [f.clave_de_sistema, f.aplica_a, f.actividad_de_flujo, f.grupo_de_flujo])).toEqual([
      ['anticipo_no_liquidado', 'debito', 'operacion', 'Anticipos no liquidados'],
      ['anticipo_por_liquidar', 'debito', 'ninguna', null],
      ['devolucion_de_anticipo', 'credito', 'ninguna', null],
      ['devolucion_de_fondo_de_caja_chica', 'credito', 'ninguna', null],
      ['fondo_de_caja_chica', 'debito', 'ninguna', null],
      ['gasto_de_anticipo', 'debito', 'operacion', 'Gastos liquidados de anticipos'],
      ['gasto_de_anticipo_de_activo', 'debito', 'inversion', 'Compra de activos'],
      ['reintegro_de_caja_chica', 'debito', 'operacion', 'Reintegros de caja chica'],
      ['reintegro_de_caja_chica_de_activo', 'debito', 'inversion', 'Compra de activos'],
    ]);
    const fondo = await clasificacion('fondo_de_caja_chica');
    expect(fondo).toHaveLength(1);
    expect(fondo[0]!.nombre).toBe('fondo de CAJA chica');
  });

  it('una empresa sin catálogo no recibe nada: lo siembra completo al abrir Conceptos', async () => {
    const otra = await darDeAltaCuenta(entorno, {
      nombre: 'Sin catálogo',
      usuario: 'propietariosincatalogo',
      modulos: ['bancos'],
    });
    const sql = readFileSync(MIGRACION, 'utf8');

    await comoPropietario(sql.replaceAll('--> statement-breakpoint', ''), []);

    const filas = await comoPropietario(`select 1 from bancos.conceptos where empresa_id = $1`, [otra.empresaId]);
    expect(filas).toHaveLength(0);
  });
});

describe('conceptos reservados elegidos a mano sin su módulo', () => {
  it('una nota de débito acepta «Fondo de caja chica» y una de crédito, «Devolución de anticipos»', async () => {
    const cuentaBancariaId = await crearCuentaBancaria(cuenta.propietario, 'Caja chica A');
    const registrar = async (tipo: 'debito' | 'credito', clave: string) => {
      const concepto = await conceptoDeSistema(cuenta.propietario, clave);
      return cuenta.propietario.post('/api/bancos/notas', {
        cuentaBancariaId,
        tipo,
        fecha: '2026-04-10',
        monto: '25.00',
        referencia: null,
        beneficiario: null,
        observaciones: null,
        conceptoId: concepto.id,
      });
    };

    expect((await registrar('debito', 'fondo_de_caja_chica')).estado).toBe(201);
    expect((await registrar('credito', 'devolucion_de_anticipo')).estado).toBe(201);
    const sinClasificar = await registrar('debito', 'sin_clasificar');
    expect(sinClasificar.estado).toBe(422);
  });
});
