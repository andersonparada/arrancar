import type { EventoDominio } from '../dominio/evento-dominio.js';

/**
 * Avisa a los demás módulos lo que ocurrió. Los casos de uso lo llaman después
 * de confirmar la transacción, para que nadie se entere de algo que no se guardó.
 */
export interface PublicadorEventos {
  publicar(eventos: readonly EventoDominio[]): Promise<void>;
}
