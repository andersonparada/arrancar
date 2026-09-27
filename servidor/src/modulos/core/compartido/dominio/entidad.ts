import type { EventoDominio } from './evento-dominio.js';
import type { Identificador } from './identificador.js';

/** Objeto del negocio con identidad propia: dos terceros con el mismo nombre siguen siendo dos terceros. */
export abstract class Entidad<Id extends Identificador> {
  protected constructor(readonly id: Id) {}

  esLaMismaQue(otra: Entidad<Id>): boolean {
    return otra.constructor === this.constructor && otra.id.esIgualA(this.id);
  }
}

/**
 * Entidad principal de un grupo que se guarda y se valida como una unidad (por
 * ejemplo un tercero con sus papeles). Anota los eventos que ocurren para que el
 * caso de uso los publique cuando la transacción se confirme.
 */
export abstract class RaizAgregado<Id extends Identificador> extends Entidad<Id> {
  private eventosPendientes: EventoDominio[] = [];

  /** Entrega los eventos ocurridos y los olvida, para no publicarlos dos veces. */
  extraerEventos(): EventoDominio[] {
    const eventos = this.eventosPendientes;
    this.eventosPendientes = [];
    return eventos;
  }

  protected registrarEvento(evento: EventoDominio): void {
    this.eventosPendientes.push(evento);
  }
}
