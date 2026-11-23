import type { DatosDeParcela, DatosEditablesDeParcela } from '../dominio/datos-de-parcela.js';
import type { CambioDeParcela, SolicitudDeParcela } from './dto/parcela.dto.js';

/** Los datos editables de la solicitud, sin los inmuebles ligados ni lo que solo se usa al crear. */
export function datosEditablesDe(cambio: CambioDeParcela): DatosEditablesDeParcela {
  return {
    tipoId: cambio.tipoId,
    nombre: cambio.nombre,
    formaDeTenencia: cambio.formaDeTenencia,
    latitud: cambio.latitud,
    longitud: cambio.longitud,
    colindanciaNorte: cambio.colindanciaNorte,
    colindanciaSur: cambio.colindanciaSur,
    colindanciaOriente: cambio.colindanciaOriente,
    colindanciaPoniente: cambio.colindanciaPoniente,
    observaciones: cambio.observaciones,
  };
}

/** Convierte lo que llega del usuario en datos de una parcela nueva. */
export function datosDeParcela(solicitud: SolicitudDeParcela): DatosDeParcela {
  return { ...datosEditablesDe(solicitud), codigo: solicitud.codigo };
}

/** Los ids de los inmuebles que se quieren ligar. */
export const inmueblesDe = (solicitud: CambioDeParcela): string[] =>
  solicitud.inmuebles.map(({ inmuebleId }) => inmuebleId);
