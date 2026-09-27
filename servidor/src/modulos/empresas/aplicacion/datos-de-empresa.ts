import { Nit } from '../../core/compartido/dominio/objetos-valor/nit.js';
import type { DatosDeEmpresa } from '../dominio/empresa.js';
import type { SolicitudDeEmpresa } from './dto/empresa.dto.js';

/** Convierte lo que llega del usuario en datos del dominio; falla si el NIT no es válido. */
export function datosDeEmpresa(solicitud: SolicitudDeEmpresa): DatosDeEmpresa {
  return { ...solicitud, nit: solicitud.nit ? Nit.crear(solicitud.nit) : null };
}
