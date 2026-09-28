import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import type { ConciliacionesControlador } from './conciliaciones.controlador.js';
import {
  esquemaEliminacionDeConciliacion,
  esquemaInicioDeConciliacion,
  esquemaMarcas,
  esquemaParamsConciliacion,
  esquemaParamsCuentaBancariaDeConciliaciones,
  esquemaSaldoSegunBanco,
} from './conciliaciones.esquemas-http.js';

type Aplicacion = Parameters<FastifyPluginAsyncZod>[0];

const etiquetas = ['Bancos'];

function rutasDeLectura(app: Aplicacion, controlador: ConciliacionesControlador) {
  const ver = proteger({ permiso: 'bancos.conciliaciones.ver' });
  app.get('/bancos/cuentas-bancarias/:cuentaBancariaId/conciliaciones', {
    schema: { tags: etiquetas, params: esquemaParamsCuentaBancariaDeConciliaciones },
    preHandler: ver,
    handler: controlador.listarDeLaCuenta,
  });
  app.get('/bancos/conciliaciones/:conciliacionId', {
    schema: { tags: etiquetas, params: esquemaParamsConciliacion },
    preHandler: ver,
    handler: controlador.obtener,
  });
}

/** Iniciar, marcar, cambiar el saldo y cerrar comparten el permiso `conciliar`. */
function rutasDeConciliar(app: Aplicacion, controlador: ConciliacionesControlador) {
  const conciliar = proteger({ permiso: 'bancos.conciliaciones.conciliar' });
  app.post('/bancos/conciliaciones', {
    schema: { tags: etiquetas, body: esquemaInicioDeConciliacion },
    preHandler: conciliar,
    handler: controlador.iniciar,
  });
  app.put('/bancos/conciliaciones/:conciliacionId/marcas', {
    schema: { tags: etiquetas, params: esquemaParamsConciliacion, body: esquemaMarcas },
    preHandler: conciliar,
    handler: controlador.guardarMarcas,
  });
  app.put('/bancos/conciliaciones/:conciliacionId/saldo', {
    schema: { tags: etiquetas, params: esquemaParamsConciliacion, body: esquemaSaldoSegunBanco },
    preHandler: conciliar,
    handler: controlador.cambiarSaldo,
  });
  app.post('/bancos/conciliaciones/:conciliacionId/cerrar', {
    schema: { tags: etiquetas, params: esquemaParamsConciliacion },
    preHandler: conciliar,
    handler: controlador.cerrar,
  });
}

/** Eliminar tiene su propio permiso: solo la última de la cuenta, con motivo. */
function rutasDeEliminar(app: Aplicacion, controlador: ConciliacionesControlador) {
  app.post('/bancos/conciliaciones/:conciliacionId/eliminar', {
    schema: { tags: etiquetas, params: esquemaParamsConciliacion, body: esquemaEliminacionDeConciliacion },
    preHandler: proteger({ permiso: 'bancos.conciliaciones.eliminar' }),
    handler: controlador.eliminar,
  });
}

/** Conciliación mensual por cuenta: sin Excel, todo desde la pantalla de conciliar. */
export function rutasConciliaciones(controlador: ConciliacionesControlador): FastifyPluginAsyncZod {
  return async (app) => {
    rutasDeLectura(app, controlador);
    rutasDeConciliar(app, controlador);
    rutasDeEliminar(app, controlador);
  };
}
