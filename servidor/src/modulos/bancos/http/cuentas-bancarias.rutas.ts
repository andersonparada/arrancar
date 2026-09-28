import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { rutasDeIntercambio, type OpcionesDeIntercambio } from '../../core/intercambio/http/rutas-de-intercambio.js';
import type { CuentasBancariasControlador } from './cuentas-bancarias.controlador.js';
import { esquemaCuentaBancaria, esquemaParamsCuentaBancaria } from './cuentas-bancarias.esquemas-http.js';

const etiquetas = ['Bancos'];
const RUTA = '/bancos/cuentas-bancarias';
const EN_EXCEL = {
  ruta: RUTA,
  archivo: 'cuentas-bancarias',
  permisos: { importar: 'bancos.cuentas-bancarias.importar', exportar: 'bancos.cuentas-bancarias.exportar' },
};

export function rutasCuentasBancarias(
  controlador: CuentasBancariasControlador,
  intercambio: OpcionesDeIntercambio['intercambio'],
): FastifyPluginAsyncZod {
  return async (app) => {
    const ver = proteger({ permiso: 'bancos.cuentas-bancarias.ver' });
    const gestionar = proteger({ permiso: 'bancos.cuentas-bancarias.gestionar' });
    const conId = { tags: etiquetas, params: esquemaParamsCuentaBancaria };

    app.get(RUTA, { schema: { tags: etiquetas }, preHandler: ver, handler: controlador.listar });
    app.get(`${RUTA}/:cuentaBancariaId`, { schema: conId, preHandler: ver, handler: controlador.obtener });
    app.post(RUTA, {
      schema: { tags: etiquetas, body: esquemaCuentaBancaria },
      preHandler: gestionar,
      handler: controlador.crear,
    });
    app.put(`${RUTA}/:cuentaBancariaId`, {
      schema: { ...conId, body: esquemaCuentaBancaria },
      preHandler: gestionar,
      handler: controlador.actualizar,
    });
    rutasDeIntercambio(app, { ...EN_EXCEL, intercambio });
  };
}
