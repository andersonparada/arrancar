import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { AccesoDenegado } from '../../core/compartido/aplicacion/errores.js';
import { proteger } from '../../core/compartido/http/guardias.js';
import { esquemaParamsDeProveedor } from './documentos.esquemas-http.js';
import type { PagosControlador } from './pagos.controlador.js';
import {
  esquemaAnularPago,
  esquemaMedios,
  esquemaNotasParaLigar,
  esquemaPago,
  esquemaPagoDeApertura,
  esquemaPagoLigado,
  esquemaParamsDePago,
  esquemaReaplicarPago,
  esquemaSaldarDiferencia,
  esquemaParaPagar,
  esquemaProveedoresPorPagar,
  type PagoLigadoSolicitado,
  type PagoSolicitado,
} from './pagos.esquemas-http.js';

const tags = ['Cuentas por pagar'];
const RUTA = '/cuentas-por-pagar';

/** Saldar una diferencia de centavos al pagar además pide `ajustes.crear`. */
async function exigirAjustesSiHayDiferencias(
  solicitud: FastifyRequest<{ Body: PagoSolicitado | PagoLigadoSolicitado }>,
): Promise<void> {
  const pide = (solicitud.body?.diferencias?.length ?? 0) > 0;
  if (pide && !solicitud.contexto?.permisos.has('cuentas-por-pagar.ajustes.crear')) throw new AccesoDenegado();
}

/**
 * Pagar con cheque o nota de débito (`pagos.emitir`) o ligar una nota ya registrada (`pagos.ligar-notas-de-debito`), con `ajustes.crear` si trae diferencias, anular, reaplicar y saldar la
 * diferencia de un pago (`pagos.anular`, `pagos.reaplicar`, `ajustes.crear`) y lo que la ventana de pago consulta (`pagos.ver`): proveedores por pagar, medios de pago y lo que se puede pagar de un proveedor.
 */
export function rutasDePagos(controlador: PagosControlador): FastifyPluginAsyncZod {
  return async (app) => {
    consultas(app, controlador);
    cambios(app, controlador);
    ligar(app, controlador);
    apertura(app, controlador);
  };
}

function consultas(app: FastifyInstance, controlador: PagosControlador): void {
  const ver = proteger({ permiso: 'cuentas-por-pagar.pagos.ver' });
  app.get(`${RUTA}/pagos/proveedores-por-pagar`, {
    schema: { tags, querystring: esquemaProveedoresPorPagar },
    preHandler: ver,
    handler: controlador.proveedoresPorPagar,
  });
  app.get(`${RUTA}/pagos/medios`, {
    schema: { tags, querystring: esquemaMedios },
    preHandler: ver,
    handler: controlador.medios,
  });
  app.get(`${RUTA}/pagos/notas-para-ligar`, {
    schema: { tags, querystring: esquemaNotasParaLigar },
    preHandler: proteger({ permiso: 'cuentas-por-pagar.pagos.ligar-notas-de-debito' }),
    handler: controlador.notasParaLigar,
  });
  app.get(`${RUTA}/proveedores/:proveedorId/para-pagar`, {
    schema: { tags, params: esquemaParamsDeProveedor, querystring: esquemaParaPagar },
    preHandler: ver,
    handler: controlador.paraPagar,
  });
}

function cambios(app: FastifyInstance, controlador: PagosControlador): void {
  app.post(`${RUTA}/pagos`, {
    schema: { tags, body: esquemaPago },
    preHandler: [proteger({ permiso: 'cuentas-por-pagar.pagos.emitir' }), exigirAjustesSiHayDiferencias],
    handler: controlador.registrar,
  });
  app.post(`${RUTA}/pagos/:id/anular`, {
    schema: { tags, params: esquemaParamsDePago, body: esquemaAnularPago },
    preHandler: proteger({ permiso: 'cuentas-por-pagar.pagos.anular' }),
    handler: controlador.anular,
  });
  app.post(`${RUTA}/pagos/:id/reaplicar`, {
    schema: { tags, params: esquemaParamsDePago, body: esquemaReaplicarPago },
    preHandler: proteger({ permiso: 'cuentas-por-pagar.pagos.reaplicar' }),
    handler: controlador.reaplicar,
  });
  app.post(`${RUTA}/pagos/:id/diferencias`, {
    schema: { tags, params: esquemaParamsDePago, body: esquemaSaldarDiferencia },
    preHandler: proteger({ permiso: 'cuentas-por-pagar.ajustes.crear' }),
    handler: controlador.saldarDiferencia,
  });
}

/** Pagar con una nota de débito que ya estaba en Bancos. */
function ligar(app: FastifyInstance, controlador: PagosControlador): void {
  app.post(`${RUTA}/pagos/ligar`, {
    schema: { tags, body: esquemaPagoLigado },
    preHandler: [proteger({ permiso: 'cuentas-por-pagar.pagos.ligar-notas-de-debito' }), exigirAjustesSiHayDiferencias],
    handler: controlador.ligar,
  });
}

/** La excepción para lo que ya estaba pagado antes de la fecha de inicio: sin dinero, con permiso propio. */
function apertura(app: FastifyInstance, controlador: PagosControlador): void {
  app.post(`${RUTA}/pagos/apertura`, {
    schema: { tags, body: esquemaPagoDeApertura },
    preHandler: proteger({ permiso: 'cuentas-por-pagar.pagos.aplicar-a-apertura' }),
    handler: controlador.aplicarAApertura,
  });
}
