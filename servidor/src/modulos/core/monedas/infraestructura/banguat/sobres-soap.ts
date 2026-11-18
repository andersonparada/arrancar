import { fechaIsoAlBanguat } from '../../dominio/fechas-de-publicacion.js';

/** Espacio de nombres del servicio del Banguat; también prefija la cabecera `SOAPAction`. */
export const ESPACIO_DE_NOMBRES = 'http://www.banguat.gob.gt/variables/ws/';

/** Una solicitud SOAP 1.1 lista para enviar. */
export interface SolicitudSoap {
  readonly accion: string;
  readonly cuerpo: string;
}

function sobre(operacion: string, parametros: string): SolicitudSoap {
  const contenido = parametros
    ? `<${operacion} xmlns="${ESPACIO_DE_NOMBRES}">${parametros}</${operacion}>`
    : `<${operacion} xmlns="${ESPACIO_DE_NOMBRES}" />`;
  return {
    accion: `${ESPACIO_DE_NOMBRES}${operacion}`,
    cuerpo:
      '<?xml version="1.0" encoding="utf-8"?>' +
      '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">' +
      `<soap:Body>${contenido}</soap:Body></soap:Envelope>`,
  };
}

/** Solicitud de `TipoCambioDia` (sin parámetros). */
export function solicitudDelDia(): SolicitudSoap {
  return sobre('TipoCambioDia', '');
}

/** Solicitud de `TipoCambioRango`; las fechas `AAAA-MM-DD` viajan como `dd/mm/aaaa`. */
export function solicitudDelRango(desde: string, hasta: string): SolicitudSoap {
  return sobre(
    'TipoCambioRango',
    `<fechainit>${fechaIsoAlBanguat(desde)}</fechainit><fechafin>${fechaIsoAlBanguat(hasta)}</fechafin>`,
  );
}
