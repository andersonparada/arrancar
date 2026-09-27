import { crearSiHayTexto } from '../../core/compartido/dominio/objeto-valor.js';
import { Correo } from '../../core/compartido/dominio/objetos-valor/correo.js';
import { Nit } from '../../core/compartido/dominio/objetos-valor/nit.js';
import { Telefono } from '../../core/compartido/dominio/objetos-valor/telefono.js';
import type { DatosDeEmpresa } from '../dominio/empresa.js';
import type { SolicitudDeEmpresa } from './dto/empresa.dto.js';

/** Convierte lo que llega del usuario en datos del dominio; falla si el NIT, el teléfono o el correo no son válidos. */
export function datosDeEmpresa(solicitud: SolicitudDeEmpresa): DatosDeEmpresa {
  return {
    ...solicitud,
    nit: crearSiHayTexto(solicitud.nit, Nit.crear),
    telefono: crearSiHayTexto(solicitud.telefono, Telefono.crear),
    correo: crearSiHayTexto(solicitud.correo, Correo.crear),
  };
}
