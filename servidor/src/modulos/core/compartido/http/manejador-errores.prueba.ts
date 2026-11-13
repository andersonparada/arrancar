import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { DemasiadasSolicitudes } from '../dominio/errores.js';
import { crearManejadorDeErrores } from './manejador-errores.js';

class SinCabecera extends DemasiadasSolicitudes {
  readonly codigo = 'sin_cabecera';
}

class ConCabecera extends DemasiadasSolicitudes {
  readonly codigo = 'con_cabecera';
  override readonly reintentarEnSegundos = 30;
}

async function responder(error: Error) {
  const app = Fastify();
  app.setErrorHandler(crearManejadorDeErrores(() => null));
  app.get('/', async () => {
    throw error;
  });
  return app.inject({ method: 'GET', url: '/' });
}

describe('manejador de errores: demasiadas solicitudes', () => {
  it('responde 429 con Retry-After cuando el error lo pide', async () => {
    const respuesta = await responder(new ConCabecera('Espere.'));
    expect(respuesta.statusCode).toBe(429);
    expect(respuesta.headers['retry-after']).toBe('30');
    expect(respuesta.json().error.codigo).toBe('con_cabecera');
  });

  it('sin tiempo de espera, no pone la cabecera', async () => {
    const respuesta = await responder(new SinCabecera('Espere.'));
    expect(respuesta.statusCode).toBe(429);
    expect(respuesta.headers['retry-after']).toBeUndefined();
  });
});
