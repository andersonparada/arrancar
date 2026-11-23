import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { rutasDeIntercambio, type OpcionesDeIntercambio } from '../../core/intercambio/http/rutas-de-intercambio.js';
import type { TiposDeParcelaControlador } from './tipos-de-parcela.controlador.js';
import { esquemaTipoDeParcela, esquemaParamsTipoDeParcela } from './tipos-de-parcela.esquemas-http.js';

type Aplicacion = Parameters<FastifyPluginAsyncZod>[0];

const etiquetas = ['Parcelas'];
const RUTA = '/parcelas/tipos-de-parcela';
const EN_EXCEL = {
  ruta: RUTA,
  archivo: 'tipos-de-parcela',
  permisos: { importar: 'parcelas.tipos-de-parcela.importar', exportar: 'parcelas.tipos-de-parcela.exportar' },
};

const conId = { tags: etiquetas, params: esquemaParamsTipoDeParcela };

/** Cada acción de escritura exige su propio permiso. */
function rutasDeEscritura(app: Aplicacion, controlador: TiposDeParcelaControlador) {
  const crear = proteger({ permiso: 'parcelas.tipos-de-parcela.crear' });
  const editar = proteger({ permiso: 'parcelas.tipos-de-parcela.editar' });

  app.post(RUTA, {
    schema: { tags: etiquetas, body: esquemaTipoDeParcela },
    preHandler: crear,
    handler: controlador.crear,
  });
  app.put(`${RUTA}/:tipoDeParcelaId`, {
    schema: { ...conId, body: esquemaTipoDeParcela },
    preHandler: editar,
    handler: controlador.actualizar,
  });
  app.delete(`${RUTA}/:tipoDeParcelaId`, {
    schema: conId,
    preHandler: proteger({ permiso: 'parcelas.tipos-de-parcela.eliminar' }),
    handler: controlador.eliminar,
  });
}

export function rutasTiposDeParcela(
  controlador: TiposDeParcelaControlador,
  intercambio: OpcionesDeIntercambio['intercambio'],
): FastifyPluginAsyncZod {
  return async (app) => {
    const ver = proteger({ permiso: 'parcelas.tipos-de-parcela.ver' });

    app.get(RUTA, { schema: { tags: etiquetas }, preHandler: ver, handler: controlador.listar });
    app.get(`${RUTA}/:tipoDeParcelaId`, { schema: conId, preHandler: ver, handler: controlador.obtener });
    rutasDeEscritura(app, controlador);
    rutasDeIntercambio(app, { ...EN_EXCEL, intercambio });
  };
}
