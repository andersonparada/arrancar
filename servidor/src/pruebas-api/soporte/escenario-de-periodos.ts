import { expect } from 'vitest';
import type { ClienteApi } from './cliente-api.js';
import { documentoDePrueba, primerDiaDelMes, RUTA_DOCUMENTOS } from './escenario-de-documentos.js';
import type { EscenarioDeDocumentos } from './escenario-de-documentos.js';

export const RUTA_PERIODOS = '/api/libro-de-compras/periodos';

/** El primer día del mes que queda `meses` después del actual (negativo, hacia atrás). */
export const mesDe = primerDiaDelMes;

/** El día 10 de un período: ahí caen la emisión y la recepción de los documentos de prueba. */
export const diaDe = (periodo: string): string => `${periodo.slice(0, 8)}10`;

/** Las fechas de un documento emitido y recibido el día 10 del período. */
export const fechasDe = (periodo: string) => ({ fechaEmision: diaDe(periodo), fechaRecepcion: diaDe(periodo) });

/** Registra una factura (con lo que se le cambie) emitida y recibida en el período; espera un 201. */
export async function registrarEn(escenario: EscenarioDeDocumentos, periodo: string, cambios = {}) {
  const cuerpo = documentoDePrueba(escenario, { ...fechasDe(periodo), ...cambios });
  const respuesta = await escenario.cuenta.propietario.post(RUTA_DOCUMENTOS, cuerpo);
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
  return { id: respuesta.cuerpo.documento.id as string, cuerpo: respuesta.cuerpo };
}

const en = (periodo: string) => `${RUTA_PERIODOS}/${periodo.slice(0, 7)}`;

export const declarar = (cliente: ClienteApi, periodo: string, cuerpo: Record<string, unknown> = {}) =>
  cliente.post(`${en(periodo)}/declarar`, cuerpo);

export const reabrir = (cliente: ClienteApi, periodo: string, motivo = 'Falta una factura') =>
  cliente.post(`${en(periodo)}/reabrir`, { motivo });

export const detalleDe = async (cliente: ClienteApi, periodo: string) => {
  const respuesta = await cliente.get(en(periodo));
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
  return respuesta.cuerpo;
};

export const encenderElBloqueo = (cliente: ClienteApi) => cliente.post(`${RUTA_PERIODOS}/control/encender`, {});

export const apagarElBloqueo = (cliente: ClienteApi, motivo?: string) =>
  cliente.post(`${RUTA_PERIODOS}/control/apagar`, motivo === undefined ? {} : { motivo });
