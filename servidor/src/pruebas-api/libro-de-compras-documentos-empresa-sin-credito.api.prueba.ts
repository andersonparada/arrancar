import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  configurarEmpresa,
  consultar,
  documentoDePrueba,
  haceDias,
  instalarDestinoFalso,
  prepararEscenario,
  RUTA_DOCUMENTOS,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';

const entorno = usarEntornoApi();
let escenario: EscenarioDeDocumentos;

const propietario = () => escenario.cuenta.propietario;
const registrar = (cambios: Record<string, unknown> = {}) =>
  propietario().post(RUTA_DOCUMENTOS, documentoDePrueba(escenario, cambios));

beforeAll(async () => {
  instalarDestinoFalso();
  escenario = await prepararEscenario(entorno, 'empresasincredito');
  await configurarEmpresa(escenario.cuenta, { regimenIva: 'pequeno_contribuyente', agenteDeRetencionIva: 'ninguno' });
});

afterAll(() => vi.restoreAllMocks());

describe('empresa pequeño contribuyente con una factura general', () => {
  it('el IVA se calcula y va al costo: queda sin acreditar y con el motivo empresa_sin_credito', async () => {
    const respuesta = await registrar();

    expect(respuesta.estado).toBe(201);
    expect(respuesta.cuerpo.documento).toMatchObject({ motivoSinCredito: 'empresa_sin_credito' });
    expect(respuesta.cuerpo.documento.totales).toMatchObject({ iva: '120.00', ivaNoAcreditable: '120.00' });
    expect(respuesta.cuerpo.documento.lineas[0]).toMatchObject({ iva: '120.00', ivaNoAcreditable: '120.00' });
    const [guardado] = await consultar(
      'select motivo_sin_credito, iva_no_acreditable from libro_de_compras.documentos where id = $1',
      [respuesta.cuerpo.documento.id],
    );
    expect(guardado).toMatchObject({ motivo_sin_credito: 'empresa_sin_credito', iva_no_acreditable: '120.00' });
  });

  it('un período viejo y la marca «no vinculado» no cambian el motivo ni sacan avisos de plazo o de rectificar', async () => {
    const vieja = haceDias(200);

    const respuesta = await registrar({ fechaEmision: vieja, fechaRecepcion: vieja, noVinculado: true });

    expect(respuesta.estado).toBe(201);
    expect(respuesta.cuerpo.documento.motivoSinCredito).toBe('empresa_sin_credito');
    const avisos: string = respuesta.cuerpo.avisos.join(' ');
    expect(avisos).not.toContain('puede estar declarado');
    expect(avisos).not.toContain('fuera del plazo');
  });

  it('anular y eliminar tampoco avisan de rectificar', async () => {
    const vieja = haceDias(100);
    const anulable = await registrar({ fechaEmision: vieja, fechaRecepcion: vieja });
    const eliminable = await registrar({ fechaEmision: vieja, fechaRecepcion: vieja });

    const anulada = await propietario().post(`${RUTA_DOCUMENTOS}/${anulable.cuerpo.documento.id}/anular`, {
      causa: 'error_de_captura',
      motivo: 'Factura equivocada',
    });
    const eliminada = await propietario().delete(`${RUTA_DOCUMENTOS}/${eliminable.cuerpo.documento.id}`);

    expect(anulada.cuerpo.avisos).toEqual([]);
    expect(eliminada.cuerpo.avisos).toEqual([]);
  });
});
