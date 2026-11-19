import type { FastifyPluginAsync } from 'fastify';
import '../../core/contratos/multimoneda.contratos.js';
import { mediador } from '../../core/mediador/contexto.js';
import { MonedasDisponibles } from '../aplicacion/casos-uso/monedas-disponibles.js';
import { CatalogoDelNucleo } from '../infraestructura/nucleo-de-monedas.js';

const MODULO = 'multimoneda';

/**
 * Atiende por el mediador las órdenes de Multimoneda (`core/contratos/multimoneda.contratos.ts`). Sin rutas HTTP: solo
 * llegan por el mediador, y con el módulo inactivo el mediador responde `ModuloNoDisponible` sin llamar al manejador.
 */
export function ordenesDeMultimoneda(): FastifyPluginAsync {
  const monedasDisponibles = new MonedasDisponibles({ catalogo: new CatalogoDelNucleo() });
  mediador.atender(MODULO, 'multimoneda.monedas_disponibles', () => monedasDisponibles.ejecutar());
  return async () => {};
}
