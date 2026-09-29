import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { rutasDeIntercambio, type OpcionesDeIntercambio } from '../../core/intercambio/http/rutas-de-intercambio.js';
import type { BancosControlador } from './bancos.controlador.js';
import { esquemaBanco, esquemaParamsBanco } from './bancos.esquemas-http.js';

const etiquetas = ['Bancos'];
const RUTA = '/bancos/bancos';
const EN_EXCEL = {
  ruta: RUTA,
  archivo: 'bancos',
  permisos: { importar: 'bancos.bancos.importar', exportar: 'bancos.bancos.exportar' },
};

export function rutasBancos(
  controlador: BancosControlador,
  intercambio: OpcionesDeIntercambio['intercambio'],
): FastifyPluginAsyncZod {
  return async (app) => {
    const ver = proteger({ permiso: 'bancos.bancos.ver' });
    const crear = proteger({ permiso: 'bancos.bancos.crear' });
    const editar = proteger({ permiso: 'bancos.bancos.editar' });
    const conId = { tags: etiquetas, params: esquemaParamsBanco };

    app.get(RUTA, { schema: { tags: etiquetas }, preHandler: ver, handler: controlador.listar });
    app.get(`${RUTA}/:bancoId`, { schema: conId, preHandler: ver, handler: controlador.obtener });
    app.post(RUTA, {
      schema: { tags: etiquetas, body: esquemaBanco },
      preHandler: crear,
      handler: controlador.crear,
    });
    app.put(`${RUTA}/:bancoId`, {
      schema: { ...conId, body: esquemaBanco },
      preHandler: editar,
      handler: controlador.actualizar,
    });
    rutasDeIntercambio(app, { ...EN_EXCEL, intercambio });
  };
}
