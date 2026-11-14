import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { conceptoDeSistema, conceptoGeneral, crearCuentaBancaria } from './soporte/escenarios-de-bancos.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const MIGRACION = new URL('../modulos/bancos/migraciones/0033_cp4_efectivo_para_pagos.sql', import.meta.url);
const CLAVES_NUEVAS = ['devolucion_de_efectivo_para_pagos', 'efectivo_para_pagos', 'faltante_de_efectivo'];
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let cuentaBancariaId = '';

interface Linea {
  etiqueta: string;
  entradas: string;
  salidas: string;
  neto: string;
}
interface Flujo {
  actividades: Array<{ actividad: string; lineas: Linea[] }>;
  lineasAparte: Array<Linea & { clave: string }>;
  control: { cuadra: boolean };
  leyenda: string | null;
}

/** Un concepto de sistema no se elige por la API: se registra con uno general y se cambia como propietario. */
async function registrarNota(tipo: 'debito' | 'credito', monto: string, conceptoDeSistemaId: string): Promise<string> {
  const creada = await cuenta.propietario.post('/api/bancos/notas', {
    cuentaBancariaId,
    tipo,
    fecha: '2026-04-10',
    monto,
    referencia: null,
    beneficiario: null,
    observaciones: null,
    conceptoId: await conceptoGeneral(cuenta.propietario),
  });
  expect(creada.estado).toBe(201);
  const id = creada.cuerpo.id as string;
  await comoPropietario('update bancos.movimientos set concepto_id = $1 where id = $2', [conceptoDeSistemaId, id]);
  return id;
}

async function flujo(consulta: string): Promise<Flujo> {
  const respuesta = await cuenta.propietario.get(`/api/bancos/flujo-de-efectivo?${consulta}`);
  expect(respuesta.estado).toBe(200);
  return respuesta.cuerpo as Flujo;
}

const lineasDe = (reporte: Flujo, actividad: string) =>
  (reporte.actividades.find((a) => a.actividad === actividad)?.lineas ?? []).map((l) => [l.etiqueta, l.salidas]);

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, {
    nombre: 'Efectivo para pagos',
    usuario: 'propietarioefectivo',
    modulos: ['bancos'],
  });
  cuentaBancariaId = await crearCuentaBancaria(cuenta.propietario, 'Efectivo A');
});

describe('migración 0033: conceptos de sistema del efectivo para pagos', () => {
  it('nacen con su flujo, también a quien ya tenía uno con ese nombre, y repetirla no duplica', async () => {
    await conceptoDeSistema(cuenta.propietario, 'pago_a_proveedor');
    await comoPropietario(
      `update bancos.conceptos set clave_de_sistema = null, nombre = 'faltante de efectivo'
       where empresa_id = $1 and clave_de_sistema = 'faltante_de_efectivo'`,
      [cuenta.empresaId],
    );
    await comoPropietario(
      `delete from bancos.conceptos where empresa_id = $1 and clave_de_sistema = 'efectivo_para_pagos'`,
      [cuenta.empresaId],
    );
    const sql = readFileSync(MIGRACION, 'utf8');
    const soloConceptos = sql.slice(sql.indexOf('UPDATE "bancos"."conceptos"'));

    await comoPropietario(soloConceptos, []);
    await comoPropietario(soloConceptos, []);

    const filas = await comoPropietario<Record<string, string | null>>(
      `select clave_de_sistema, nombre, aplica_a, actividad_de_flujo, grupo_de_flujo from bancos.conceptos
       where empresa_id = $1 and clave_de_sistema = any($2) order by clave_de_sistema`,
      [cuenta.empresaId, CLAVES_NUEVAS],
    );
    expect(filas.map((f) => [f.clave_de_sistema, f.aplica_a, f.actividad_de_flujo, f.grupo_de_flujo])).toEqual([
      ['devolucion_de_efectivo_para_pagos', 'credito', 'ninguna', null],
      ['efectivo_para_pagos', 'debito', 'ninguna', null],
      ['faltante_de_efectivo', 'debito', 'operacion', 'Faltante de efectivo'],
    ]);
    expect(filas.find((f) => f.clave_de_sistema === 'faltante_de_efectivo')!.nombre).toBe('faltante de efectivo');
  });
});

describe('flujo de efectivo con un retiro desglosado', () => {
  beforeAll(async () => {
    const pago = await conceptoDeSistema(cuenta.propietario, 'pago_a_proveedor');
    const activo = await conceptoDeSistema(cuenta.propietario, 'pago_a_proveedor_de_activo');
    const faltante = await conceptoDeSistema(cuenta.propietario, 'faltante_de_efectivo');
    const efectivo = await conceptoDeSistema(cuenta.propietario, 'efectivo_para_pagos');
    const devolucion = await conceptoDeSistema(cuenta.propietario, 'devolucion_de_efectivo_para_pagos');
    const retiro = await registrarNota('debito', '100.00', pago.id);
    const partes: Array<[string, string]> = [
      [pago.id, '60.00'],
      [activo.id, '20.00'],
      [faltante.id, '5.00'],
      [efectivo.id, '15.00'],
    ];
    for (const [conceptoId, monto] of partes) {
      await comoPropietario(
        `insert into bancos.desglose_de_movimientos (empresa_id, movimiento_id, concepto_id, monto)
         values ($1, $2, $3, $4)`,
        [cuenta.empresaId, retiro, conceptoId, monto],
      );
    }
    await registrarNota('credito', '10.00', devolucion.id);
  });

  it('cuenta lo pagado y el faltante, y lo que sobró queda sin flujo', async () => {
    const reporte = await flujo('desde=2026-04-01&hasta=2026-04-30');

    expect(lineasDe(reporte, 'operacion')).toEqual([
      ['Faltante de efectivo', '5.00'],
      ['Pagos a proveedores', '60.00'],
    ]);
    expect(lineasDe(reporte, 'inversion')).toEqual([['Compra de activos', '20.00']]);
    const sinFlujo = reporte.lineasAparte.find((l) => l.clave === 'sin_actividad')!;
    expect([sinFlujo.entradas, sinFlujo.salidas, sinFlujo.neto]).toEqual(['10.00', '15.00', '-5.00']);
    expect(reporte.control.cuadra).toBe(true);
  });

  it('muestra la leyenda solo cuando el período tiene esos conceptos', async () => {
    const con = await flujo('desde=2026-04-01&hasta=2026-04-30');
    const sin = await flujo('desde=2026-01-01&hasta=2026-03-31');

    expect(con.leyenda).toContain('fecha del retiro del banco');
    expect(sin.leyenda).toBeNull();
  });
});
