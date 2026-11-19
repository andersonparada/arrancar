import { describe, expect, it } from 'vitest';
import { EventoDominio } from './evento-dominio.js';

class HechoDePrueba extends EventoDominio {
  readonly nombre = 'prueba.hecho';

  constructor() {
    super({});
  }
}

class HechoEnVersionDos extends EventoDominio {
  readonly nombre = 'prueba.hecho';
  override readonly version = 2;

  constructor() {
    super({});
  }
}

describe('evento de dominio', () => {
  it('nace con un id propio y distinto en cada evento', () => {
    const [primero, segundo] = [new HechoDePrueba(), new HechoDePrueba()];

    expect(primero.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(primero.id).not.toBe(segundo.id);
  });

  it('es de la versión 1 salvo que el evento diga otra', () => {
    expect(new HechoDePrueba().version).toBe(1);
    expect(new HechoEnVersionDos().version).toBe(2);
  });
});
