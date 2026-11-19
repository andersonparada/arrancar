/**
 * Concurrencia de la capitalización (AF-3): dos peticiones a la vez no pueden pasar de lo que costó la línea (candado de
 * la línea) ni dejar el costo de un activo negativo (activo bloqueado).
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { instalarDestinoFalso } from './soporte/escenario-de-documentos.js';
import {
  asignacionNueva,
  capitalizar,
  costosDeActivo,
  prepararBandeja,
  registrarDocumento,
  registrarNotaDeCredito,
  type EscenarioDeBandeja,
} from './soporte/escenario-de-bandeja-de-activos.js';

const entorno = usarEntornoApi();
let e: EscenarioDeBandeja;

beforeAll(async () => {
  instalarDestinoFalso();
  e = await prepararBandeja(entorno, 'afconcurrencia');
});

afterAll(() => vi.restoreAllMocks());

describe('concurrencia de la línea', () => {
  it('dos capitalizaciones de Q600.00 de una línea de Q1,000.00 a la vez: pasa una y la otra se rechaza', async () => {
    const { lineaIds } = await registrarDocumento(e);

    const respuestas = await Promise.all(
      [1, 2].map((n) =>
        capitalizar(e, [asignacionNueva(e, { lineaId: lineaIds[0]!, monto: '600.00', descripcion: `Parte ${n}` })]),
      ),
    );

    expect(respuestas.map((r) => r.estado).sort()).toEqual([201, 422]);
    const rechazada = respuestas.find((r) => r.estado === 422)!;
    expect(rechazada.cuerpo.error.codigo).toBe('linea_sobrecapitalizada');
    const [suma] = await comoPropietario<{ total: string; filas: string }>(
      "select sum(monto) total, count(*) filas from activos_fijos.costos where linea_de_documento_id = $1 and estado = 'vigente'",
      [lineaIds[0]],
    );
    expect(suma).toEqual({ total: '600.00', filas: '1' });
  });

  it('muchas capitalizaciones a la vez nunca pasan del costo de la línea', async () => {
    const { lineaIds } = await registrarDocumento(e);

    const respuestas = await Promise.all(
      Array.from({ length: 6 }, (_, n) =>
        capitalizar(e, [asignacionNueva(e, { lineaId: lineaIds[0]!, monto: '250.00', descripcion: `Pieza ${n}` })]),
      ),
    );

    expect(respuestas.filter((r) => r.estado === 201)).toHaveLength(4);
    expect(respuestas.filter((r) => r.estado === 422)).toHaveLength(2);
    const [suma] = await comoPropietario<{ total: string }>(
      "select sum(monto) total from activos_fijos.costos where linea_de_documento_id = $1 and estado = 'vigente'",
      [lineaIds[0]],
    );
    expect(suma!.total).toBe('1000.00');
  });

  it('dos operaciones con las mismas líneas en distinto orden no se esperan en círculo', async () => {
    const a = await registrarDocumento(e);
    const b = await registrarDocumento(e);
    const pedido = (primera: string, segunda: string) =>
      capitalizar(e, [
        asignacionNueva(e, { lineaId: primera, monto: '100.00' }),
        asignacionNueva(e, { lineaId: segunda, monto: '100.00' }),
      ]);

    const respuestas = await Promise.all([
      pedido(a.lineaIds[0]!, b.lineaIds[0]!),
      pedido(b.lineaIds[0]!, a.lineaIds[0]!),
    ]);

    expect(respuestas.map((r) => r.estado)).toEqual([201, 201]);
  });
});

describe('concurrencia del total del activo', () => {
  it('dos notas de crédito a la vez que juntas dejarían el activo en negativo: pasa una', async () => {
    const factura = await registrarDocumento(e);
    const { cuerpo } = await capitalizar(e, [asignacionNueva(e, { lineaId: factura.lineaIds[0]!, monto: '600.00' })]);
    const activoId = cuerpo.activos[0].id as string;
    const notaUno = await registrarNotaDeCredito(e, factura.documentoId, '560.00');
    const notaDos = await registrarNotaDeCredito(e, factura.documentoId, '560.00');

    const respuestas = await Promise.all(
      [notaUno, notaDos].map((nota) => capitalizar(e, [{ lineaId: nota.lineaIds[0], monto: '-500.00', activoId }])),
    );

    expect(respuestas.map((r) => r.estado).sort()).toEqual([201, 422]);
    expect(respuestas.find((r) => r.estado === 422)!.cuerpo.error.codigo).toBe('costo_de_activo_negativo');
    expect((await costosDeActivo(e, activoId)).cuerpo.total).toBe('100.00');
  });

  it('anular un costo y sumar una nota de crédito a la vez, que juntos lo dejarían en negativo: pasa uno', async () => {
    const factura = await registrarDocumento(e);
    const { cuerpo } = await capitalizar(e, [asignacionNueva(e, { lineaId: factura.lineaIds[0]!, monto: '500.00' })]);
    const activoId = cuerpo.activos[0].id as string;
    const manual = await e.cuenta.propietario.post(`/api/activos-fijos/activos/${activoId}/costos`, {
      claseDeCosto: 'importacion',
      fecha: '2026-11-05',
      monto: '300.00',
      documentoDeSoporte: 'DUCA 1',
    });
    const nota = await registrarNotaDeCredito(e, factura.documentoId, '784.00');

    const respuestas = await Promise.all([
      e.cuenta.propietario.post(`/api/activos-fijos/costos/${manual.cuerpo.id}/anular`, { motivo: 'Error' }),
      capitalizar(e, [{ lineaId: nota.lineaIds[0], monto: '-700.00', activoId }]),
    ]);

    expect(respuestas.filter((r) => r.estado === 422)).toHaveLength(1);
    expect(respuestas.filter((r) => r.estado < 300)).toHaveLength(1);
    expect(Number((await costosDeActivo(e, activoId)).cuerpo.total)).toBeGreaterThanOrEqual(0);
  });
});
