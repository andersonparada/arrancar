/**
 * Anulación de documentos de venta por la API: la fecha de la SAT es obligatoria con esa causa, y solo el número
 * anulado en la SAT queda ocupado (lo anulado por error de captura deja registrar el documento correcto).
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  documentoDeVentaDePrueba,
  prepararEscenarioDeVentas,
  RUTA_DOCUMENTOS_DE_VENTA as RUTA,
  type EscenarioDeVentas,
} from './soporte/escenario-de-ventas.js';

const entorno = usarEntornoApi();
let escenario: EscenarioDeVentas;

const propietario = () => escenario.cuenta.propietario;
const registrar = async (cambios: Record<string, unknown> = {}) => {
  const respuesta = await propietario().post(RUTA, documentoDeVentaDePrueba(escenario, cambios));
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
  return respuesta.cuerpo.documento as { id: string; fechaEmision: string };
};
const anular = (id: string, cambios: Record<string, unknown> = {}) =>
  propietario().post(`${RUTA}/${id}/anular`, { causa: 'error_de_captura', motivo: 'Prueba', ...cambios });

beforeAll(async () => {
  escenario = await prepararEscenarioDeVentas(entorno, 'ventasanulacion');
});

afterAll(() => vi.restoreAllMocks());

describe('fecha de anulación', () => {
  it('con la FEL anulada en la SAT la fecha es obligatoria y no se presume', async () => {
    const original = await registrar({ serie: 'SAT', numero: '1' });

    const sinFecha = await anular(original.id, { causa: 'fel_anulada_en_la_sat' });
    const conFecha = await anular(original.id, {
      causa: 'fel_anulada_en_la_sat',
      fechaDeAnulacion: original.fechaEmision,
    });

    expect(sinFecha.estado).toBe(400);
    expect(sinFecha.cuerpo.error.codigo).toBe('fecha_de_anulacion_requerida');
    expect(conFecha.cuerpo.documento.anulacion).toMatchObject({ fecha: original.fechaEmision });
  });

  it('con error de captura la fecha es la de hoy aunque venga otra', async () => {
    const original = await registrar({ serie: 'CAP', numero: '1' });

    const respuesta = await anular(original.id, { fechaDeAnulacion: original.fechaEmision });

    expect(respuesta.cuerpo.documento.anulacion.fecha).toBe(original.fechaEmision);
  });
});

describe('número de un documento anulado', () => {
  it('el anulado en la SAT no se reutiliza', async () => {
    const original = await registrar({ serie: 'NOR', numero: '1' });
    await anular(original.id, { causa: 'fel_anulada_en_la_sat', fechaDeAnulacion: original.fechaEmision });

    const repetido = await propietario().post(RUTA, documentoDeVentaDePrueba(escenario, { serie: 'NOR', numero: '1' }));

    expect(repetido.cuerpo.error.codigo).toBe('documento_repetido');
  });

  it('el anulado por error de captura deja registrar el DTE correcto con su mismo número y autorización', async () => {
    const autorizacionFel = crypto.randomUUID();
    const mal = { serie: 'ERR', numero: '1', tipoDte: 'FACT', tipo: undefined, autorizacionFel };
    const capturado = await registrar(mal);
    await anular(capturado.id);

    const correcto = await propietario().post(RUTA, documentoDeVentaDePrueba(escenario, mal));

    expect(correcto.estado, JSON.stringify(correcto.cuerpo)).toBe(201);
  });
});
