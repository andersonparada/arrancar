import type { FastifyPluginAsync } from 'fastify';
import '../../core/contratos/contabilidad.contratos.js';
import { mediador } from '../../core/mediador/contexto.js';
import { ResponderLlavesDeEnlaceDelLibro } from '../aplicacion/casos-uso/conceptos-de-gasto/responder-llaves-de-enlace.js';
import { ConsultasConceptosDeGastoDrizzle } from '../infraestructura/persistencia/consultas-conceptos-de-gasto.drizzle.js';

/**
 * Raíz de composición de la respuesta a Contabilidad: este módulo dice qué reglas de retención y conceptos de gasto se
 * pueden enlazar a una cuenta contable (`contabilidad.llaves_de_enlace`); sin rutas propias.
 */
export function respuestaDeLlavesDeEnlaceComponida(): FastifyPluginAsync {
  const responder = new ResponderLlavesDeEnlaceDelLibro(new ConsultasConceptosDeGastoDrizzle());
  mediador.responder('libro-de-compras', 'contabilidad.llaves_de_enlace', (datos) => responder.ejecutar(datos));
  return async () => {};
}
