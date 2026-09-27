import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { rutasDelModulo } from './rutas-del-modulo.js';

describe('rutas del módulo', () => {
  it('registra las rutas de todos sus recursos', async () => {
    const app = Fastify();
    await app.register(
      rutasDelModulo([
        async (recurso) => void recurso.get('/animales', () => 'animales'),
        async (recurso) => void recurso.get('/potreros', () => 'potreros'),
      ]),
    );

    const respuestas = await Promise.all(['/animales', '/potreros'].map((url) => app.inject({ url })));

    expect(respuestas.map((respuesta) => respuesta.body)).toEqual(['animales', 'potreros']);
  });

  it('un módulo sin recursos no registra nada', async () => {
    const app = Fastify();
    await app.register(rutasDelModulo([]));

    expect((await app.inject({ url: '/animales' })).statusCode).toBe(404);
  });
});
