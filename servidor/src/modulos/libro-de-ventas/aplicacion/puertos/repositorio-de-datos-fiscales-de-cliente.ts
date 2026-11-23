import type { DatosFiscalesDeCliente } from '../../dominio/datos-fiscales-de-cliente.js';

/** Los datos fiscales de los clientes de la cuenta de la transacción (una fila por cliente). */
export interface RepositorioDeDatosFiscalesDeCliente {
  /** `null` si nunca se guardaron: el cliente no retiene nada. */
  buscar(clienteId: string): Promise<DatosFiscalesDeCliente | null>;
  /** Crea la fila o cambia la que había. */
  guardar(clienteId: string, datos: DatosFiscalesDeCliente): Promise<void>;
  /** Si el cliente existe en la cuenta de la transacción. */
  existe(clienteId: string): Promise<boolean>;
}
