import type { DatosFiscalesDeCliente } from '../../../dominio/datos-fiscales-de-cliente.js';
import type { DatosFiscalesDeClienteDto } from '../../dto/datos-fiscales-de-cliente.dto.js';

/** Los datos del cliente como los ve la pantalla; `guardado` dice si vienen de una fila o son los de omisión. */
export function dtoDeCliente(
  clienteId: string,
  datos: DatosFiscalesDeCliente,
  guardado: boolean,
): DatosFiscalesDeClienteDto {
  return { clienteId, ...datos.instantanea(), guardado };
}
