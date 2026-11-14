/**
 * Cambiar la fecha de inicio con notas sobre facturas del sistema anterior (U8l-5): Empresas avisa por el mediador y
 * Libro de compras rechaza la fecha nueva si alguna nota vigente quedaría fuera, en los dos sentidos; nada cambia.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { MODULOS_DE_CUENTAS_POR_PAGAR } from './soporte/cuentas-por-pagar.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  configurarEmpresa,
  documentoDePrueba,
  haceDias,
  HOY,
  prepararEscenario,
  RUTA_DOCUMENTOS,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';

const entorno = usarEntornoApi();
const FECHA_DE_INICIO = haceDias(10);
const FACTURA_ANTERIOR = haceDias(40);
const RECEPCION = haceDias(5);

let escenario: EscenarioDeDocumentos;
let notaId = '';

const propietario = () => escenario.cuenta.propietario;
const rutaCarga = () => `/api/empresas/${escenario.cuenta.empresaId}/carga-inicial`;
const fijar = (fechaDeInicio: string) => propietario().put(rutaCarga(), { fechaDeInicio });
const fechaActual = async () => (await propietario().get(rutaCarga())).cuerpo.fechaDeInicio;

beforeAll(async () => {
  escenario = await prepararEscenario(entorno, 'notasfacantfecha', MODULOS_DE_CUENTAS_POR_PAGAR);
  await configurarEmpresa(escenario.cuenta, {
    regimenIva: 'general',
    regimenIsr: 'utilidades',
    agenteDeRetencionIva: 'ninguno',
    esAgenteDeRetencionIsr: false,
  });
  expect((await fijar(FECHA_DE_INICIO)).estado).toBe(200);
  const registrada = await propietario().post(
    RUTA_DOCUMENTOS,
    documentoDePrueba(escenario, {
      tipoDte: 'NCRE',
      serie: 'N',
      numero: 'FI1',
      fechaEmision: RECEPCION,
      fechaRecepcion: RECEPCION,
      facturaAnterior: {
        tipo: 'factura',
        serie: 'B',
        numero: 'FI900',
        fechaEmision: FACTURA_ANTERIOR,
        total: '1120.00',
        iva: '120.00',
        motivoSinCredito: null,
      },
      lineas: [{ conceptoId: escenario.conceptoId, total: '560.00' }],
    }),
  );
  expect(registrada.estado, JSON.stringify(registrada.cuerpo)).toBe(201);
  notaId = registrada.cuerpo.documento.id;
});

describe('cambiar la fecha de inicio con una nota sobre una factura del sistema anterior', () => {
  it('una fecha igual o anterior a la de la factura se rechaza y deja la fecha como estaba', async () => {
    for (const fecha of [FACTURA_ANTERIOR, haceDias(45)]) {
      const respuesta = await fijar(fecha);

      expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(422);
      expect(respuesta.cuerpo.error.codigo).toBe('facturas_anteriores_posteriores_a_la_fecha');
      expect(respuesta.cuerpo.error.detalles).toMatchObject({ cantidad: 1, notas: [{ id: notaId, numero: 'FI1' }] });
    }
    expect(await fechaActual()).toBe(FECHA_DE_INICIO);
  });

  it('una fecha posterior a la recepción de la nota se rechaza', async () => {
    const respuesta = await fijar(HOY);

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('notas_recibidas_antes_de_la_fecha');
    expect(respuesta.cuerpo.error.detalles).toMatchObject({ cantidad: 1, notas: [{ id: notaId }] });
    expect(await fechaActual()).toBe(FECHA_DE_INICIO);
  });

  it('una fecha entre la factura y la recepción pasa, y la recepción misma también', async () => {
    expect((await fijar(haceDias(20))).estado).toBe(200);
    expect((await fijar(RECEPCION)).estado).toBe(200);
    expect(await fechaActual()).toBe(RECEPCION);
  });

  it('con la nota anulada ya no estorba', async () => {
    const anulada = await propietario().post(`${RUTA_DOCUMENTOS}/${notaId}/anular`, {
      causa: 'error_de_captura',
      motivo: 'Error de captura',
    });
    expect(anulada.estado, JSON.stringify(anulada.cuerpo)).toBe(200);

    expect((await fijar(HOY)).estado).toBe(200);
    expect((await fijar(haceDias(45))).estado).toBe(200);
  });
});
