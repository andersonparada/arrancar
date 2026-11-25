import type { DatosDeCuenta } from '../dominio/cuenta.js';
import type { SolicitudDeCuenta } from './dto/cuenta.dto.js';

/** Convierte lo que llega del usuario en datos del dominio. */
export function datosDeCuenta(solicitud: SolicitudDeCuenta): DatosDeCuenta {
  return { ...solicitud };
}
