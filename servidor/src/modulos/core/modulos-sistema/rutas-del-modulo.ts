import type { FastifyPluginAsync } from 'fastify';

/**
 * Junta las rutas de los recursos de un módulo en un solo plugin, que es lo que
 * espera `DefinicionModulo.rutas`. El generador agrega aquí cada recurso nuevo.
 */
export function rutasDelModulo(rutas: readonly FastifyPluginAsync[]): FastifyPluginAsync {
  return async (app) => {
    for (const registrar of rutas) await app.register(registrar);
  };
}
