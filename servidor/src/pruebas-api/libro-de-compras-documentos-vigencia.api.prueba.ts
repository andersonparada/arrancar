import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  documentoDePrueba,
  instalarDestinoFalso,
  prepararEscenario,
  RUTA_DOCUMENTOS,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';

const RUTA_VIGENCIAS = '/api/libro-de-compras/vigencias-de-combustible';
const entorno = usarEntornoApi();
let escenario: EscenarioDeDocumentos;

const propietario = () => escenario.cuenta.propietario;

const DATOS_DE_LA_VIGENCIA = (escenario: EscenarioDeDocumentos) => ({
  combustibleId: escenario.combustibleId,
  idpPorGalon: '4.70',
  porcentajeDeEtanol: '0.00',
  vigenteDesde: '2026-01-01',
  vigenteHasta: null,
});

async function crearVigencia(): Promise<string> {
  const vigencia = await propietario().post(RUTA_VIGENCIAS, DATOS_DE_LA_VIGENCIA(escenario));
  expect(vigencia.estado).toBe(201);
  return vigencia.cuerpo.id;
}

/** Registra una factura con una línea de combustible: queda aplicada la vigencia de la fecha de emisión. */
async function registrarConCombustible(): Promise<string> {
  const respuesta = await propietario().post(
    RUTA_DOCUMENTOS,
    documentoDePrueba(escenario, {
      lineas: [
        { conceptoId: escenario.conceptoId, combustibleId: escenario.combustibleId, galones: '10', total: '500.00' },
      ],
    }),
  );
  expect(respuesta.estado).toBe(201);
  expect(respuesta.cuerpo.documento.lineas[0].combustible).toMatchObject({ idpPorGalon: '4.70' });
  return respuesta.cuerpo.documento.id;
}

beforeAll(async () => {
  instalarDestinoFalso();
  escenario = await prepararEscenario(entorno, 'vigenciausada');
});

afterAll(() => vi.restoreAllMocks());

describe('vigencia de combustible usada por documentos reales', () => {
  it('con un documento vigente que la aplica no se elimina ni se le cambia la tasa', async () => {
    const vigenciaId = await crearVigencia();
    await registrarConCombustible();

    const eliminada = await propietario().delete(`${RUTA_VIGENCIAS}/${vigenciaId}`);
    const cambiada = await propietario().put(`${RUTA_VIGENCIAS}/${vigenciaId}`, {
      ...DATOS_DE_LA_VIGENCIA(escenario),
      idpPorGalon: '5.00',
    });

    expect(eliminada.estado).toBe(409);
    expect(eliminada.cuerpo.error.codigo).toBe('en_uso');
    expect(cambiada.estado).toBeGreaterThanOrEqual(400);
    expect(cambiada.cuerpo.error.codigo).not.toBeUndefined();
  });

  it('si el documento se anula, ya no cuenta como uso: la tasa se puede cambiar, pero la vigencia sigue sin eliminarse', async () => {
    escenario = await prepararEscenario(entorno, 'vigenciaanulada');
    const vigenciaId = await crearVigencia();
    const documentoId = await registrarConCombustible();
    const cambio = { ...DATOS_DE_LA_VIGENCIA(escenario), idpPorGalon: '5.00' };
    expect((await propietario().put(`${RUTA_VIGENCIAS}/${vigenciaId}`, cambio)).estado).toBeGreaterThanOrEqual(400);

    await propietario().post(`${RUTA_DOCUMENTOS}/${documentoId}/anular`, {
      causa: 'error_de_captura',
      motivo: 'Factura equivocada',
    });
    const cambiada = await propietario().put(`${RUTA_VIGENCIAS}/${vigenciaId}`, cambio);
    const eliminada = await propietario().delete(`${RUTA_VIGENCIAS}/${vigenciaId}`);

    expect(cambiada.estado).toBe(200);
    expect(eliminada.estado).toBe(409);
  });

  it('si el documento se elimina, la vigencia también queda libre', async () => {
    escenario = await prepararEscenario(entorno, 'vigenciaeliminada');
    const vigenciaId = await crearVigencia();
    const documentoId = await registrarConCombustible();

    await propietario().delete(`${RUTA_DOCUMENTOS}/${documentoId}`);

    expect((await propietario().delete(`${RUTA_VIGENCIAS}/${vigenciaId}`)).estado).toBe(204);
  });
});
