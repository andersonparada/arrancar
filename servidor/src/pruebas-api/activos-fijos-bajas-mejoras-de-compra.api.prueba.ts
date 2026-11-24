/**
 * Una baja no precede a una mejora (AF-9) cuando la mejora se hizo con líneas del libro de compras: manda la fecha de la
 * mejora y no la de emisión de la factura.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { datosDeActivo } from './soporte/escenario-de-activos.js';
import { baja } from './soporte/escenario-de-bajas-de-activos.js';
import {
  prepararBandeja,
  registrarDocumento,
  type EscenarioDeBandeja,
} from './soporte/escenario-de-bandeja-de-activos.js';
import { instalarDestinoFalso } from './soporte/escenario-de-documentos.js';

const ACTIVOS = '/api/activos-fijos/activos';
const BAJAS = '/api/activos-fijos/bajas';
const MEJORAS = '/api/activos-fijos/mejoras';
const entorno = usarEntornoApi();
let e: EscenarioDeBandeja;

/** Un vehículo de Q250,000.00 en uso desde el 10 de septiembre de 2026. */
async function vehiculoEnUso(): Promise<string> {
  const creado = await e.cuenta.propietario.post(
    ACTIVOS,
    datosDeActivo(e.claseVehiculosId, { fechaDeAdquisicion: '2026-09-01' }),
  );
  const id = creado.cuerpo.id as string;
  await e.cuenta.propietario.post(`${ACTIVOS}/${id}/costos`, {
    claseDeCosto: 'adquisicion',
    fecha: '2026-09-05',
    monto: '250000.00',
    documentoDeSoporte: 'Escritura 15',
  });
  await e.cuenta.propietario.post(`${ACTIVOS}/${id}/poner-en-uso`, { fechaDeInicioDeUso: '2026-09-10' });
  return id;
}

/** Una mejora del activo con una línea de una factura emitida en `emision`. */
async function mejoraConFactura(activoId: string, fechas: { mejora: string; emision: string }): Promise<void> {
  const { lineaIds } = await registrarDocumento(e, { fechaEmision: fechas.emision, fechaRecepcion: fechas.emision });
  const creada = await e.cuenta.propietario.post(MEJORAS, {
    activoId,
    clase: 'mejora',
    fecha: fechas.mejora,
    descripcion: 'Motor nuevo',
    lineas: [{ lineaId: lineaIds[0], monto: '1000.00' }],
    costosManuales: [],
  });
  expect(creada.estado, JSON.stringify(creada.cuerpo)).toBe(201);
}

beforeAll(async () => {
  instalarDestinoFalso();
  e = await prepararBandeja(entorno, 'afbajasmejcompra');
});

afterAll(() => vi.restoreAllMocks());

describe('baja y mejora hecha con líneas del libro de compras', () => {
  it('se rechaza una baja anterior a la mejora aunque la factura sea anterior a la baja', async () => {
    const id = await vehiculoEnUso();
    await mejoraConFactura(id, { mejora: '2026-10-15', emision: '2026-08-20' });

    const respuesta = await e.cuenta.propietario.post(BAJAS, baja(id, { fecha: '2026-09-30' }));

    expect([respuesta.estado, respuesta.cuerpo.error?.codigo]).toEqual([422, 'baja_anterior_a_una_mejora']);
  });

  it('se acepta una baja posterior a la mejora aunque la factura sea posterior a la baja', async () => {
    const id = await vehiculoEnUso();
    await mejoraConFactura(id, { mejora: '2026-09-10', emision: '2026-10-05' });

    const respuesta = await e.cuenta.propietario.post(BAJAS, baja(id, { fecha: '2026-09-20' }));

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
  });
});
