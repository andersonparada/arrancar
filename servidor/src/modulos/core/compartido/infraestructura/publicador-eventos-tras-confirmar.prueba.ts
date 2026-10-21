import { describe, expect, it } from 'vitest';
import { EventoDominio } from '../dominio/evento-dominio.js';
import { PublicadorEventosEnMemoria } from '../pruebas/dobles-compartidos.js';
import { PublicadorEventosTrasConfirmar } from './publicador-eventos-tras-confirmar.js';

class HechoDePrueba extends EventoDominio {
  readonly nombre = 'prueba.hecho';

  constructor() {
    super({});
  }
}

describe('publicador de eventos tras confirmar', () => {
  it('fuera de una transacción publica de inmediato', async () => {
    const interno = new PublicadorEventosEnMemoria();

    await new PublicadorEventosTrasConfirmar(interno).publicar([new HechoDePrueba()]);

    expect(interno.nombres()).toEqual(['prueba.hecho']);
  });
});
