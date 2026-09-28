import type { DatosDeCuentaBancaria } from '../dominio/cuenta-bancaria.js';
import type { SolicitudDeCuentaBancaria } from './dto/cuenta-bancaria.dto.js';

/** Convierte lo que llega del usuario en datos del dominio. */
export function datosDeCuentaBancaria(solicitud: SolicitudDeCuentaBancaria): DatosDeCuentaBancaria {
  return { ...solicitud };
}
