import { expect } from 'vitest';
import type { ClienteApi } from './cliente-api.js';
import type { EntornoApi } from './entorno-api.js';
import {
  configurarEmpresa,
  documentoDePrueba,
  haceDias,
  HOY,
  instalarDestinoFalso,
  nitValido,
  prepararEscenario,
  registrarProveedor,
  RUTA_DOCUMENTOS,
  type EscenarioDeDocumentos,
} from './escenario-de-documentos.js';

export const RUTA_RETENCIONES = '/api/libro-de-compras/retenciones';
export const MES_DE_HOY = `${HOY.slice(0, 7)}-01`;
/** Un documento de hace cuatro meses: su plazo de entero ya venció. */
export const FECHA_VIEJA = haceDias(120);
export const MES_VIEJO = `${FECHA_VIEJA.slice(0, 7)}-01`;

export interface EscenarioDeRetenciones {
  escenario: EscenarioDeDocumentos;
  /** Proveedor del régimen opcional simplificado: retiene IVA e ISR. */
  opcional: string;
  /** Pequeño contribuyente: retiene el 5 % del IVA. */
  pequeno: string;
  propietario: ClienteApi;
  registrar(proveedorId: string, cambios?: Record<string, unknown>): Promise<RespuestaDeRegistro>;
}

export interface RespuestaDeRegistro {
  estado: number;
  cuerpo: any;
  id: string;
}

/** Una empresa agente de IVA (contribuyente especial) e ISR, con tres proveedores que le retienen. */
export async function prepararRetenciones(entorno: EntornoApi, usuario: string): Promise<EscenarioDeRetenciones> {
  instalarDestinoFalso();
  const escenario = await prepararEscenario(entorno, usuario);
  await configurarEmpresa(escenario.cuenta, {
    agenteDeRetencionIva: 'contribuyente_especial',
    esAgenteDeRetencionIsr: true,
  });
  const nits = new Map<string, string>();
  const nitDe = (proveedorId: string) => {
    if (!nits.has(proveedorId)) nits.set(proveedorId, nitValido(String(2000001 + nits.size)));
    return nits.get(proveedorId)!;
  };
  const conRegimen = (nombre: string, seccion: Record<string, unknown>) =>
    registrarProveedor(escenario.cuenta, nombre, { secciones: { 'libro-de-compras': seccion } });
  const opcional = (await conRegimen('Simplificado', { regimenIsr: 'opcional_simplificado' })).proveedorId;
  const pequeno = (await conRegimen('Pequeño', { regimenIva: 'pequeno_contribuyente' })).proveedorId;
  const propietario = escenario.cuenta.propietario;
  const registrar = async (proveedorId: string, cambios: Record<string, unknown> = {}) => {
    const lineas = [{ conceptoId: escenario.conceptoId, total: '5600.00' }];
    const cuerpo = documentoDePrueba(escenario, { proveedorId, nitEmisor: nitDe(proveedorId), lineas, ...cambios });
    const respuesta = await propietario.post(RUTA_DOCUMENTOS, cuerpo);
    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    return { estado: respuesta.estado, cuerpo: respuesta.cuerpo, id: respuesta.cuerpo.documento.id as string };
  };
  return { escenario, opcional, pequeno, propietario, registrar };
}

/** Las retenciones del mes que devuelve la API, con los filtros dados (`grupo=…&constancia=…`). */
export async function reporteDelMes(cliente: ClienteApi, mes: string, filtros = '') {
  const respuesta = await cliente.get(`${RUTA_RETENCIONES}?mes=${mes.slice(0, 7)}${filtros ? `&${filtros}` : ''}`);
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
  return respuesta.cuerpo;
}

/** Las filas de retención (vigentes y de anulados) del reporte, de un documento. */
export const filasDelDocumento = (reporte: any, documentoId: string): any[] =>
  [...reporte.retenciones, ...reporte.anuladas].filter((fila: any) => fila.documento.id === documentoId);
