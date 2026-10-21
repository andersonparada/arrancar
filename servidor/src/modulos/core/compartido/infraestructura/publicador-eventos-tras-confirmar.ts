import type { PublicadorEventos } from '../aplicacion/publicador-eventos.js';
import type { EventoDominio } from '../dominio/evento-dominio.js';
import { despuesDeConfirmar } from './unidad-de-trabajo-postgres.js';

/**
 * Para los casos de uso que corren dentro de la transacción de otro módulo (un aviso o una orden del mediador): los
 * eventos esperan a que esa transacción se confirme y, si se deshace, no se publican. Fuera de una transacción
 * publica de inmediato, como cualquier otro publicador.
 */
export class PublicadorEventosTrasConfirmar implements PublicadorEventos {
  constructor(private readonly publicador: PublicadorEventos) {}

  async publicar(eventos: readonly EventoDominio[]): Promise<void> {
    const diferido = despuesDeConfirmar(() => this.publicador.publicar(eventos));
    if (!diferido) await this.publicador.publicar(eventos);
  }
}
