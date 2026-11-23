import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { esquemaAnulacion, esquemaParamsDocumento } from './movimientos.esquemas-http.js';
import type { RecepcionesControlador } from './recepciones.controlador.js';
import {
  esquemaDescarte,
  esquemaDevolucion,
  esquemaFiltrosDePorRecibir,
  esquemaFiltrosDeRecepciones,
  esquemaParamsLinea,
  esquemaRebaja,
  esquemaRecepcion,
} from './recepciones.esquemas-http.js';

type Aplicacion = Parameters<FastifyPluginAsyncZod>[0];

const tags = ['Inventarios'];
const conId = { tags, params: esquemaParamsDocumento, body: esquemaAnulacion };

/** La bandeja «Por recibir»: ver, descartar una línea y devolverla a la bandeja. */
function rutasDeLaBandeja(app: Aplicacion, controlador: RecepcionesControlador) {
  app.get('/inventarios/por-recibir', {
    schema: { tags, querystring: esquemaFiltrosDePorRecibir },
    preHandler: proteger({ permiso: 'inventarios.recepciones.ver' }),
    handler: controlador.listar,
  });
  app.post('/inventarios/por-recibir/:lineaId/descartar', {
    schema: { tags, params: esquemaParamsLinea, body: esquemaDescarte },
    preHandler: proteger({ permiso: 'inventarios.recepciones.descartar' }),
    handler: controlador.descartar,
  });
  app.post('/inventarios/por-recibir/:lineaId/devolver', {
    schema: { tags, params: esquemaParamsLinea },
    preHandler: proteger({ permiso: 'inventarios.recepciones.descartar' }),
    handler: controlador.devolverALaBandeja,
  });
}

const permisos = () => ({
  crear: proteger({ permiso: 'inventarios.recepciones.crear' }),
  anular: proteger({ permiso: 'inventarios.recepciones.anular' }),
});

/** Recepciones: ver las de una factura y crear (`recepciones.crear`) y anular (`recepciones.anular`). */
function rutasDeRecepciones(app: Aplicacion, controlador: RecepcionesControlador) {
  const { crear, anular } = permisos();
  app.get('/inventarios/recepciones', {
    schema: { tags, querystring: esquemaFiltrosDeRecepciones },
    preHandler: crear,
    handler: controlador.listarDeUnaFactura,
  });
  app.post('/inventarios/recepciones', {
    schema: { tags, body: esquemaRecepcion },
    preHandler: crear,
    handler: controlador.recibir,
  });
  app.post('/inventarios/recepciones/:documentoId/anular', {
    schema: conId,
    preHandler: anular,
    handler: controlador.anularRecepcion,
  });
}

/** Devoluciones a proveedor y rebajas de costo, que aplican una nota de crédito: mismos permisos que las recepciones. */
function rutasDeNotas(app: Aplicacion, controlador: RecepcionesControlador) {
  const { crear, anular } = permisos();
  app.post('/inventarios/devoluciones-a-proveedor', {
    schema: { tags, body: esquemaDevolucion },
    preHandler: crear,
    handler: controlador.devolver,
  });
  app.post('/inventarios/devoluciones-a-proveedor/:documentoId/anular', {
    schema: conId,
    preHandler: anular,
    handler: controlador.anularDevolucion,
  });
  app.post('/inventarios/rebajas-de-costo', {
    schema: { tags, body: esquemaRebaja },
    preHandler: crear,
    handler: controlador.rebajar,
  });
  app.post('/inventarios/rebajas-de-costo/:documentoId/anular', {
    schema: conId,
    preHandler: anular,
    handler: controlador.anularRebaja,
  });
}

export function rutasRecepciones(controlador: RecepcionesControlador): FastifyPluginAsyncZod {
  return async (app) => {
    rutasDeLaBandeja(app, controlador);
    rutasDeRecepciones(app, controlador);
    rutasDeNotas(app, controlador);
  };
}
