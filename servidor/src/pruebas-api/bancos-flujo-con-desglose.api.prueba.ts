import { beforeAll, describe, expect, it } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { conceptoDeSistema, crearCuentaBancaria } from './soporte/escenarios-de-bancos.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let cuentaBancariaId = '';
let notaMixta = '';
let notaMarcada = '';

interface Flujo {
  actividades: Array<{ actividad: string; lineas: Array<Record<string, string>> }>;
}

/** Como propietario de la base (el servidor aún no escribe desgloses: lo harán las órdenes de CP4-B2a). */
async function fijarDesglose(movimientoId: string, lineas: Array<[string, string]>): Promise<void> {
  for (const [conceptoId, monto] of lineas) {
    await comoPropietario(
      `insert into bancos.desglose_de_movimientos (empresa_id, movimiento_id, concepto_id, monto)
       values ($1, $2, $3, $4)`,
      [cuenta.empresaId, movimientoId, conceptoId, monto],
    );
  }
}

async function registrarDebito(monto: string, conceptoId: string): Promise<string> {
  const creada = await cuenta.propietario.post('/api/bancos/notas', {
    cuentaBancariaId,
    tipo: 'debito',
    fecha: '2026-02-10',
    monto,
    referencia: null,
    beneficiario: null,
    observaciones: null,
    conceptoId,
  });
  expect(creada.estado).toBe(201);
  return creada.cuerpo.id as string;
}

async function lineasDe(consulta: string, actividad: string): Promise<string[][]> {
  const respuesta = await cuenta.propietario.get(`/api/bancos/flujo-de-efectivo?${consulta}`);
  expect(respuesta.estado).toBe(200);
  const reporte = respuesta.cuerpo as Flujo;
  const lineas = reporte.actividades.find((a) => a.actividad === actividad)?.lineas ?? [];
  return lineas.map((l) => [l.etiqueta!, l.entradas!, l.salidas!]);
}

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, {
    nombre: 'Desglose',
    usuario: 'propietariodesglose',
    modulos: ['bancos'],
  });
  cuentaBancariaId = await crearCuentaBancaria(cuenta.propietario, 'Desglose A');
  const operacion = await conceptoDeSistema(cuenta.propietario, 'pago_a_proveedor');
  const activo = await conceptoDeSistema(cuenta.propietario, 'pago_a_proveedor_de_activo');
  const otro = await cuenta.propietario.post('/api/bancos/conceptos', {
    nombre: 'Compras varias',
    aplicaA: 'debito',
    actividadDeFlujo: 'operacion',
    grupoDeFlujo: 'Pagos a proveedores',
    esCargoBancario: false,
    pideDatosDeIntereses: false,
    admiteFactura: false,
    activo: true,
  });
  notaMixta = await registrarDebito('100.00', otro.cuerpo.id);
  await fijarDesglose(notaMixta, [
    [operacion.id, '60.00'],
    [activo.id, '40.00'],
  ]);
  // Una nota marcada para Cuentas por pagar: el concepto del movimiento es la marca y todo el reparto va a Inversión.
  notaMarcada = await registrarDebito('50.00', otro.cuerpo.id);
  await comoPropietario('update bancos.movimientos set concepto_id = $1 where id = $2', [operacion.id, notaMarcada]);
  await fijarDesglose(notaMarcada, [[activo.id, '50.00']]);
});

describe('flujo de efectivo con desglose de movimientos', () => {
  it('un movimiento desglosado reparte su monto entre Operación e Inversión', async () => {
    expect(await lineasDe('desde=2026-02-01&hasta=2026-02-28', 'operacion')).toEqual([
      ['Pagos a proveedores', '0.00', '60.00'],
    ]);
    expect(await lineasDe('desde=2026-02-01&hasta=2026-02-28', 'inversion')).toEqual([
      ['Compra de activos', '0.00', '90.00'],
    ]);
  });

  it('la nota marcada con todo el desglose en Inversión no cuenta en Operación', async () => {
    const reporte = await cuenta.propietario.get(
      '/api/bancos/movimientos-por-concepto?desde=2026-02-01&hasta=2026-02-28',
    );
    const filas = reporte.cuerpo.conceptos as Array<{ conceptoNombre: string; salidas: string; cantidad: number }>;
    const deActivo = filas.find((f) => f.conceptoNombre === 'Pago a proveedores de activo fijo')!;
    expect(deActivo).toMatchObject({ salidas: '90.00', cantidad: 2 });
    expect(filas.find((f) => f.conceptoNombre === 'Pago a proveedores')).toMatchObject({
      salidas: '60.00',
      cantidad: 1,
    });
  });

  it('el inverso de una nota desglosada resta en los mismos conceptos y montos', async () => {
    const anulada = await cuenta.propietario.post(`/api/bancos/notas/${notaMixta}/anular`, {
      motivo: 'Error',
      fecha: '2026-03-05',
    });
    expect(anulada.estado).toBe(200);

    expect(await lineasDe('desde=2026-02-01&hasta=2026-03-31', 'operacion')).toEqual([
      ['Pagos a proveedores', '0.00', '0.00'],
    ]);
    expect(await lineasDe('desde=2026-02-01&hasta=2026-03-31', 'inversion')).toEqual([
      ['Compra de activos', '0.00', '50.00'],
    ]);
    expect(await lineasDe('desde=2026-03-01&hasta=2026-03-31', 'inversion')).toEqual([
      ['Compra de activos', '0.00', '-40.00'],
    ]);
  });
});
