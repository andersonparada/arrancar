import type { FastifyPluginAsync } from 'fastify';
import '../../core/contratos/libro-de-compras.contratos.js';
import { mediador } from '../../core/mediador/contexto.js';
import { ResponderPagadoAlProveedor } from '../aplicacion/casos-uso/efectivo/responder-pagado-al-proveedor.js';
import { ConsultasDePagosDrizzle } from '../infraestructura/persistencia/consultas-de-pagos.drizzle.js';

/**
 * Raíz de composición de la respuesta a la bancarización compartida: este módulo dice lo pagado al proveedor en el mes cuando
 * el libro pregunta (`libro-de-compras.pagado_al_proveedor_en_el_mes`); sin rutas propias.
 */
export function respuestaDePagadoAlProveedorComponida(): FastifyPluginAsync {
  const responder = new ResponderPagadoAlProveedor(new ConsultasDePagosDrizzle());
  mediador.responder('cuentas-por-pagar', 'libro-de-compras.pagado_al_proveedor_en_el_mes', (datos) =>
    responder.ejecutar(datos),
  );
  return async () => {};
}
