import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { rutasDeIntercambio, type OpcionesDeIntercambio } from '../../core/intercambio/http/rutas-de-intercambio.js';
import type { CuentasControlador } from './cuentas.controlador.js';
import { esquemaCuenta, esquemaParamsCuenta } from './cuentas.esquemas-http.js';

type Aplicacion = Parameters<FastifyPluginAsyncZod>[0];

const etiquetas = ['Contabilidad'];
const RUTA = '/contabilidad/cuentas';
const EN_EXCEL = {
  ruta: RUTA,
  archivo: 'cuentas',
  permisos: { importar: 'contabilidad.cuentas.importar', exportar: 'contabilidad.cuentas.exportar' },
};

const conId = { tags: etiquetas, params: esquemaParamsCuenta };

/** Cada acción de escritura exige su propio permiso. */
function rutasDeEscritura(app: Aplicacion, controlador: CuentasControlador) {
  const crear = proteger({ permiso: 'contabilidad.cuentas.crear' });
  const editar = proteger({ permiso: 'contabilidad.cuentas.editar' });
  const eliminar = proteger({ permiso: 'contabilidad.cuentas.eliminar' });

  app.post(RUTA, {
    schema: { tags: etiquetas, body: esquemaCuenta },
    preHandler: crear,
    handler: controlador.crear,
  });
  app.put(`${RUTA}/:cuentaId`, {
    schema: { ...conId, body: esquemaCuenta },
    preHandler: editar,
    handler: controlador.actualizar,
  });
  app.delete(`${RUTA}/:cuentaId`, { schema: conId, preHandler: eliminar, handler: controlador.eliminar });
}

export function rutasCuentas(
  controlador: CuentasControlador,
  intercambio: OpcionesDeIntercambio['intercambio'],
): FastifyPluginAsyncZod {
  return async (app) => {
    const ver = proteger({ permiso: 'contabilidad.cuentas.ver' });

    app.get(RUTA, { schema: { tags: etiquetas }, preHandler: ver, handler: controlador.listar });
    app.get(`${RUTA}/:cuentaId`, { schema: conId, preHandler: ver, handler: controlador.obtener });
    rutasDeEscritura(app, controlador);
    rutasDeIntercambio(app, { ...EN_EXCEL, intercambio });
  };
}
