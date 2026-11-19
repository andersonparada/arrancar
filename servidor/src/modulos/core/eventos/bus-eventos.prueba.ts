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

describe('BusEventos.suscribirSinRomper', () => {
  it('atrapa el fallo, lo registra con el evento y el suscriptor (sin los datos) y sigue con los demás', async () => {
    const fallos: Array<[string, string, unknown]> = [];
    const bus = new BusEventos((evento, suscriptor, error) => void fallos.push([evento, suscriptor, error]));
    const error = new Error('se cayó');
    const recibidos: number[] = [];
    bus.suscribirSinRomper(
      'prueba.ocurrio',
      async () => {
        throw error;
      },
      'aviso de pago',
    );
    bus.suscribir('prueba.ocurrio', ({ valor }) => void recibidos.push(valor));

    await expect(bus.publicar('prueba.ocurrio', { valor: 9 })).resolves.toBeUndefined();

    expect(fallos).toEqual([['prueba.ocurrio', 'aviso de pago', error]]);
    expect(recibidos).toEqual([9]);
  });

  it('atrapa también el fallo de un suscriptor síncrono', async () => {
    const fallos: unknown[] = [];
    const bus = new BusEventos((_evento, _suscriptor, error) => void fallos.push(error));
    bus.suscribirSinRomper('prueba.ocurrio', () => {
      throw new Error('síncrono');
    });

    await expect(bus.publicar('prueba.ocurrio', { valor: 1 })).resolves.toBeUndefined();

    expect(fallos).toHaveLength(1);
  });

  it('con suscribir, en cambio, el fallo sigue propagándose', async () => {
    const bus = new BusEventos(() => undefined);
    bus.suscribir('prueba.ocurrio', () => {
      throw new Error('sin protección');
    });

    await expect(bus.publicar('prueba.ocurrio', { valor: 1 })).rejects.toThrow('sin protección');
  });

  it('espera al suscriptor y entrega los datos; la baja lo deja de notificar', async () => {
    const bus = new BusEventos(() => undefined);
    const recibidos: number[] = [];
    const baja = bus.suscribirSinRomper('prueba.ocurrio', async ({ valor }) => {
      await new Promise((resolver) => setTimeout(resolver, 10));
      recibidos.push(valor);
    });

    await bus.publicar('prueba.ocurrio', { valor: 1 });
    baja();
    await bus.publicar('prueba.ocurrio', { valor: 2 });

    expect(recibidos).toEqual([1]);
  });

  it('usarRegistro cambia dónde se anotan los fallos', async () => {
    const bus = new BusEventos(() => undefined);
    const fallos: string[] = [];
    bus.usarRegistro((evento) => void fallos.push(evento));
    bus.suscribirSinRomper('prueba.ocurrio', () => {
      throw new Error('x');
    });

    await bus.publicar('prueba.ocurrio', { valor: 1 });

    expect(fallos).toEqual(['prueba.ocurrio']);
  });
});
