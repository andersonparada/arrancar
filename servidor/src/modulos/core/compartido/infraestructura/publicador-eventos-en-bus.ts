import type { BusEventos } from '../../eventos/bus-eventos.js';
import type { PublicadorEventos } from '../aplicacion/publicador-eventos.js';
import type { EventoDominio } from '../dominio/evento-dominio.js';

/**
 * El bus tipa cada evento con el catálogo `EventosDominio`, que el dominio no
 * conoce. La correspondencia entre nombre y datos la garantiza cada módulo al
 * declarar sus eventos en ese catálogo.
 */
type PublicarSinCatalogo = (nombre: string, datos: object) => Promise<void>;

/** Entrega los eventos de dominio al bus en memoria, en el orden en que ocurrieron. */
export class PublicadorEventosEnBus implements PublicadorEventos {
  private readonly publicarEnBus: PublicarSinCatalogo;

  constructor(bus: BusEventos) {
    this.publicarEnBus = bus.publicar.bind(bus) as PublicarSinCatalogo;
  }

  async publicar(eventos: readonly EventoDominio[]): Promise<void> {
    for (const evento of eventos) await this.publicarEnBus(evento.nombre, evento.datos);
  }
}
