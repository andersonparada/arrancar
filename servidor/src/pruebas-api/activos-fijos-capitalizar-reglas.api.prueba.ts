/**
 * Capitalizar desde la bandeja (AF-3 y AFI-2), segunda parte: tope de 200 unidades, costos que llegan después a una
 * compra conjunta y la regla de la línea.
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
  RUTA_ACTIVOS,
  type EscenarioDeBandeja,
} from './soporte/escenario-de-bandeja-de-activos.js';

const entorno = usarEntornoApi();
let e: EscenarioDeBandeja;

const activos = async () => (await e.cuenta.propietario.get(RUTA_ACTIVOS)).cuerpo as Array<Record<string, any>>;
/** Una factura de una línea con el costo dado (el total lleva IVA: Q1,120.00 son Q1,000.00 de costo). */
const factura = (total: string) =>
  registrarDocumento(e, { lineas: [{ conceptoId: e.conceptoDeActivoId, total, esActivoFijo: true }] });

beforeAll(async () => {
  instalarDestinoFalso();
  e = await prepararBandeja(entorno, 'afcapitalizarreglas');
});

afterAll(() => vi.restoreAllMocks());

describe('tope de 200 unidades por operación', () => {
  it('201 unidades se rechazan antes de crear nada', async () => {
    const { lineaIds } = await factura('112000.00');
    const antes = (await activos()).length;

    const respuesta = await capitalizar(e, [
      asignacionNueva(e, { lineaId: lineaIds[0]!, monto: '100000.00', unidades: 201 }),
    ]);
    const dos = await capitalizar(e, [
      asignacionNueva(e, { lineaId: lineaIds[0]!, monto: '40000.00', unidades: 100 }),
      asignacionNueva(e, { lineaId: lineaIds[0]!, monto: '40000.00', unidades: 101 }),
    ]);

    expect(respuesta.estado).toBe(400);
    expect(respuesta.cuerpo.error.codigo).toBe('demasiadas_unidades');
    expect(dos.cuerpo.error.codigo).toBe('demasiadas_unidades');
    expect((await activos()).length).toBe(antes);
  });

  it('200 unidades caben: 200 activos con códigos distintos y la suma exacta del monto', async () => {
    const { lineaIds } = await factura('112000.00');

    const respuesta = await capitalizar(e, [
      asignacionNueva(e, { lineaId: lineaIds[0]!, monto: '100000.00', unidades: 200 }),
    ]);

    expect(respuesta.estado).toBe(201);
    expect(respuesta.cuerpo.activos).toHaveLength(200);
    expect(new Set(respuesta.cuerpo.activos.map((a: { codigo: string }) => a.codigo)).size).toBe(200);
    const [suma] = await comoPropietario<{ total: string }>(
      'select sum(monto) total from activos_fijos.costos where linea_de_documento_id = $1',
      [lineaIds[0]],
    );
    expect(suma!.total).toBe('100000.00');
  });
});

describe('costos que llegan después a una compra conjunta', () => {
  it('el flete se reparte igual entre los activos de la compra, con el sobrante en el último', async () => {
    const { lineaIds: compra } = await factura('1120.00');
    const { lineaIds: flete } = await factura('112.01');
    const tractores = await capitalizar(e, [
      asignacionNueva(e, { lineaId: compra[0]!, monto: '1000.00', unidades: 3 }),
    ]);

    const respuesta = await capitalizar(e, [
      {
        lineaId: flete[0],
        monto: '100.01',
        altaConjuntaId: tractores.cuerpo.altaConjuntaIds[0],
        claseDeCosto: 'flete',
      },
    ]);

    expect(respuesta.estado).toBe(201);
    const montos = await Promise.all(
      tractores.cuerpo.activos.map(
        async (a: { id: string }) =>
          (await costosDeActivo(e, a.id)).cuerpo.costos.find(
            (c: { claseDeCosto: string }) => c.claseDeCosto === 'flete',
          ).monto,
      ),
    );
    expect(montos).toEqual(['33.33', '33.33', '33.35']);
  });

  it('una compra conjunta que no existe no recibe costos', async () => {
    const { lineaIds } = await factura('112.00');

    const respuesta = await capitalizar(e, [
      { lineaId: lineaIds[0], monto: '50.00', altaConjuntaId: crypto.randomUUID() },
    ]);

    expect(respuesta.estado).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('alta_conjunta_sin_activos_vigentes');
  });
});

describe('la regla de la línea', () => {
  it('no se capitaliza más de lo que costó la línea, ni de una vez ni en partes', async () => {
    const { lineaIds } = await factura('1120.00');

    const demasiado = await capitalizar(e, [asignacionNueva(e, { lineaId: lineaIds[0]!, monto: '1000.01' })]);
    await capitalizar(e, [asignacionNueva(e, { lineaId: lineaIds[0]!, monto: '999.99' })]);
    const resto = await capitalizar(e, [asignacionNueva(e, { lineaId: lineaIds[0]!, monto: '0.02' })]);

    expect(demasiado.estado).toBe(422);
    expect(demasiado.cuerpo.error.codigo).toBe('linea_sobrecapitalizada');
    expect(resto.cuerpo.error.codigo).toBe('linea_sobrecapitalizada');
    expect(resto.cuerpo.error.detalles).toEqual({ pendienteCentavos: 1 });
  });

  it('cada parte lleva uno y solo un destino', async () => {
    const { lineaIds } = await factura('112.00');

    const sinDestino = await capitalizar(e, [{ lineaId: lineaIds[0], monto: '10.00' }]);
    const dosDestinos = await capitalizar(e, [
      { ...asignacionNueva(e, { lineaId: lineaIds[0]!, monto: '10.00' }), activoId: crypto.randomUUID() },
    ]);

    expect(sinDestino.cuerpo.error.codigo).toBe('costo_invalido');
    expect(dosDestinos.cuerpo.error.codigo).toBe('costo_invalido');
  });
});
