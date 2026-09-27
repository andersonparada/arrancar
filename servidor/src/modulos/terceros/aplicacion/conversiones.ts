import { crearSiHayTexto } from '../../core/compartido/dominio/objeto-valor.js';
import { Correo } from '../../core/compartido/dominio/objetos-valor/correo.js';
import { Dpi } from '../../core/compartido/dominio/objetos-valor/dpi.js';
import { Nit } from '../../core/compartido/dominio/objetos-valor/nit.js';
import { Telefono } from '../../core/compartido/dominio/objetos-valor/telefono.js';
import type { DatosDeContacto } from '../dominio/contacto.js';
import { IdentidadDeTercero } from '../dominio/identidad-de-tercero.js';
import type { DatosDeTercero } from '../dominio/tercero.js';
import type { SolicitudDeContacto } from './dto/contacto.dto.js';
import type { SolicitudDeTercero } from './dto/tercero.dto.js';

/** Convierte lo que llega del usuario en datos del dominio; falla con el primer dato inválido. */
export function datosDeTercero(solicitud: SolicitudDeTercero): DatosDeTercero {
  const { tipo, departamentoCodigo, municipioCodigo, direccion } = solicitud;
  return {
    identidad: IdentidadDeTercero.crear(tipo, solicitud),
    nit: crearSiHayTexto(solicitud.nit, Nit.crear),
    dpi: crearSiHayTexto(solicitud.dpi, Dpi.crear),
    telefono: crearSiHayTexto(solicitud.telefono, Telefono.crear),
    whatsapp: crearSiHayTexto(solicitud.whatsapp, Telefono.crear),
    correo: crearSiHayTexto(solicitud.correo, Correo.crear),
    ubicacion: { departamentoCodigo, municipioCodigo, direccion },
    fotoArchivoId: solicitud.fotoArchivoId,
    notas: solicitud.notas,
    activo: solicitud.activo,
  };
}

export function datosDeContacto(solicitud: SolicitudDeContacto): DatosDeContacto {
  return {
    ...solicitud,
    telefono: crearSiHayTexto(solicitud.telefono, Telefono.crear),
    whatsapp: crearSiHayTexto(solicitud.whatsapp, Telefono.crear),
    correo: crearSiHayTexto(solicitud.correo, Correo.crear),
  };
}
