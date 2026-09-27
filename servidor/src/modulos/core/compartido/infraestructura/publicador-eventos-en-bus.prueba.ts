import { describe, expect, it } from 'vitest';
import { BusEventos } from '../../eventos/bus-eventos.js';
import { EventoDominio } from '../dominio/evento-dominio.js';
import { PublicadorEventosEnBus } from './publicador-eventos-en-bus.js';

class VacaPesada extends EventoDominio<{ arete: string; kilos: number }> {
  readonly nombre = 'pruebas.vaca_pesada';

  constructor(arete: string, kilos: number) {
    super({ arete, kilos });
  }
}

describe('publicador de eventos en el bus', () => {
  it('entrega cada evento a sus suscriptores, en orden', async () => {
    const bus = new BusEventos();
    const recibidos: unknown[] = [];
    const suscribir = bus.suscribir.bind(bus) as (nombre: string, suscriptor: (datos: unknown) => void) => void;
    suscribir('pruebas.vaca_pesada', (datos) => recibidos.push(datos));

    await new PublicadorEventosEnBus(bus).publicar([new VacaPesada('0412', 380), new VacaPesada('0413', 402)]);

    expect(recibidos).toEqual([
      { arete: '0412', kilos: 380 },
      { arete: '0413', kilos: 402 },
    ]);
  });
});
