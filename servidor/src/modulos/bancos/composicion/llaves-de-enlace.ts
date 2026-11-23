import type { FastifyPluginAsync } from 'fastify';
import '../../core/contratos/contabilidad.contratos.js';
import { mediador } from '../../core/mediador/contexto.js';
import { ResponderLlavesDeEnlaceDeBancos } from '../aplicacion/casos-uso/ordenes/responder-llaves-de-enlace.js';
import { ConsultasConceptosDrizzle } from '../infraestructura/persistencia/consultas-conceptos.drizzle.js';
import { ConsultasCuentasBancariasDrizzle } from '../infraestructura/persistencia/consultas-cuentas-bancarias.drizzle.js';

/**
 * Raíz de composición de la respuesta a Contabilidad: este módulo dice qué cuentas bancarias y conceptos se pueden
 * enlazar a una cuenta contable (`contabilidad.llaves_de_enlace`); sin rutas propias.
 */
export function respuestaDeLlavesDeEnlaceComponida(): FastifyPluginAsync {
  const responder = new ResponderLlavesDeEnlaceDeBancos(
    new ConsultasCuentasBancariasDrizzle(),
    new ConsultasConceptosDrizzle(),
  );
  mediador.responder('bancos', 'contabilidad.llaves_de_enlace', (datos) => responder.ejecutar(datos));
  return async () => {};
}
