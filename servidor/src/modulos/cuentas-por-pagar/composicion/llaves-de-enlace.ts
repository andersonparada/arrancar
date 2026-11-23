import type { FastifyPluginAsync } from 'fastify';
import '../../core/contratos/contabilidad.contratos.js';
import { mediador } from '../../core/mediador/contexto.js';
import { ResponderLlavesDeEnlaceDeCuentasPorPagar } from '../aplicacion/casos-uso/efectivo/responder-llaves-de-enlace.js';
import { CategoriasDeProveedorDrizzle } from '../infraestructura/persistencia/categorias-de-proveedor.drizzle.js';

/**
 * Raíz de composición de la respuesta a Contabilidad: este módulo dice qué categorías de proveedor se pueden enlazar a
 * una cuenta contable (`contabilidad.llaves_de_enlace`); sin rutas propias.
 */
export function respuestaDeLlavesDeEnlaceComponida(): FastifyPluginAsync {
  const responder = new ResponderLlavesDeEnlaceDeCuentasPorPagar(new CategoriasDeProveedorDrizzle());
  mediador.responder('cuentas-por-pagar', 'contabilidad.llaves_de_enlace', (datos) => responder.ejecutar(datos));
  return async () => {};
}
