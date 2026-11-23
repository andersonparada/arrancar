import type { PropiedadesFiscalesDeCliente } from '../../dominio/datos-fiscales-de-cliente.js';

/** Datos fiscales de un cliente tal como los ve el usuario; `guardado` es falso si son los valores por omisión. */
export interface DatosFiscalesDeClienteDto extends PropiedadesFiscalesDeCliente {
  clienteId: string;
  guardado: boolean;
}
