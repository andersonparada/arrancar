import { describe, expect, it, vi } from 'vitest';
import { BusEventos } from './bus-eventos.js';

declare module './bus-eventos.js' {
  interface EventosDominio {
    'prueba.ocurrio': { valor: number };
  }
}

describe('BusEventos', () => {
  it('notifica a los suscriptores en orden con los datos del evento', async () => {
    const bus = new BusEventos();
    const recibidos: string[] = [];
    bus.suscribir('prueba.ocurrio', ({ valor }) => void recibidos.push(`a${valor}`));
    bus.suscribir('prueba.ocurrio', async ({ valor }) => void recibidos.push(`b${valor}`));

    await bus.publicar('prueba.ocurrio', { valor: 7 });
    expect(recibidos).toEqual(['a7', 'b7']);
  });

  it('publicar sin suscriptores no falla', async () => {
    await expect(new BusEventos().publicar('prueba.ocurrio', { valor: 1 })).resolves.toBeUndefined();
  });

  it('la baja deja de notificar al suscriptor', async () => {
    const bus = new BusEventos();
    const suscriptor = vi.fn();
    const darDeBaja = bus.suscribir('prueba.ocurrio', suscriptor);
    darDeBaja();
    await bus.publicar('prueba.ocurrio', { valor: 1 });
    expect(suscriptor).not.toHaveBeenCalled();
  });
});
