import { beforeAll, describe, expect, it } from 'vitest';
import { DocumentosPorPagarDePrueba, MODULOS_DE_CUENTAS_POR_PAGAR } from './soporte/cuentas-por-pagar.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  configurarEmpresa,
  documentoDePrueba,
  haceDias,
  HOY,
  nitValido,
  prepararEscenario,
  registrarProveedor,
  RUTA_DOCUMENTOS,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';
import { filasDelDocumento, MES_DE_HOY, reporteDelMes, RUTA_RETENCIONES } from './soporte/escenario-de-retenciones.js';

const RUTA = '/api/cuentas-por-pagar/documentos';
const entorno = usarEntornoApi();
let escenario: EscenarioDeDocumentos;
let documentos: DocumentosPorPagarDePrueba;
let simplificado: string;

const propietario = () => escenario.cuenta.propietario;
const anular = (id: string) =>
  propietario().post(`${RUTA}/${id}/anular`, { causa: 'error_de_captura', motivo: 'Error' });

/** Registra una factura de un régimen opcional simplificado (la empresa le retiene) y anota la constancia si se pide. */
async function registrarRetenida(conConstancia: boolean): Promise<string> {
  const lineas = [{ conceptoId: escenario.conceptoId, total: '5600.00' }];
  const cuerpo = documentoDePrueba(escenario, { proveedorId: simplificado, nitEmisor: nitValido('3000001'), lineas });
  const registrada = await propietario().post(RUTA_DOCUMENTOS, cuerpo);
  expect(registrada.estado, JSON.stringify(registrada.cuerpo)).toBe(201);
  const libroId = registrada.cuerpo.documento.id as string;
  if (conConstancia) {
    const reporte = await reporteDelMes(propietario(), MES_DE_HOY);
    const retencionId = filasDelDocumento(reporte, libroId)[0].id as string;
    const anotada = await propietario().put(`${RUTA_RETENCIONES}/${retencionId}/constancia`, {
      numero: `K-${libroId.slice(0, 6)}`,
      fecha: HOY,
    });
    expect(anotada.estado).toBe(200);
  }
  return (await documentos.fila(libroId))!.id;
}

beforeAll(async () => {
  escenario = await prepararEscenario(entorno, 'cxpbajasavisos', MODULOS_DE_CUENTAS_POR_PAGAR);
  documentos = new DocumentosPorPagarDePrueba(escenario, haceDias(3));
  await configurarEmpresa(escenario.cuenta, {
    agenteDeRetencionIva: 'contribuyente_especial',
    esAgenteDeRetencionIsr: true,
  });
  simplificado = (
    await registrarProveedor(escenario.cuenta, 'Simplificado', {
      secciones: { 'libro-de-compras': { regimenIsr: 'opcional_simplificado' } },
    })
  ).proveedorId;
});

describe('avisos al anular desde Cuentas por pagar', () => {
  it('con una retención constanciada, la respuesta trae el aviso de las retenciones por resolver', async () => {
    const id = await registrarRetenida(true);

    const respuesta = await anular(id);

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo).toMatchObject({ id, estado: 'anulado' });
    expect(respuesta.cuerpo.avisos.join(' ')).toContain('retenciones por resolver');
  });

  it('sin retenciones por resolver ni período declarado, los avisos vienen vacíos', async () => {
    const libroId = await documentos.registrar();

    const respuesta = await anular((await documentos.fila(libroId))!.id);

    expect(respuesta.estado).toBe(200);
    expect(respuesta.cuerpo.avisos).toEqual([]);
  });
});
