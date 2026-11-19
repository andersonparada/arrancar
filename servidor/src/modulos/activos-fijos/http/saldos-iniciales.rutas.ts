import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { rutasDeIntercambio, type OpcionesDeIntercambio } from '../../core/intercambio/http/rutas-de-intercambio.js';
import type { SaldosInicialesControlador } from './saldos-iniciales.controlador.js';
import { esquemaParamsSaldoInicial, esquemaSaldoInicial } from './saldos-iniciales.esquemas-http.js';

type Aplicacion = Parameters<FastifyPluginAsyncZod>[0];

const etiquetas = ['Activos fijos'];
const RUTA = '/activos-fijos/saldos-iniciales';
const EN_EXCEL = {
  ruta: RUTA,
  archivo: 'saldos-iniciales-de-activos-fijos',
  permisos: {
    importar: 'activos-fijos.saldos-iniciales.importar',
    exportar: 'activos-fijos.saldos-iniciales.exportar',
  },
};

const conId = { tags: etiquetas, params: esquemaParamsSaldoInicial };

/** Cada acción de escritura exige su propio permiso. */
function rutasDeEscritura(app: Aplicacion, controlador: SaldosInicialesControlador) {
  app.post(RUTA, {
    schema: { tags: etiquetas, body: esquemaSaldoInicial },
    preHandler: proteger({ permiso: 'activos-fijos.saldos-iniciales.crear' }),
    handler: controlador.guardar,
  });
  app.put(`${RUTA}/:activoId`, {
    schema: { ...conId, body: esquemaSaldoInicial },
    preHandler: proteger({ permiso: 'activos-fijos.saldos-iniciales.editar' }),
    handler: controlador.corregir,
  });
  app.delete(`${RUTA}/:activoId`, {
    schema: conId,
    preHandler: proteger({ permiso: 'activos-fijos.saldos-iniciales.eliminar' }),
    handler: controlador.eliminar,
  });
}

export function rutasSaldosIniciales(
  controlador: SaldosInicialesControlador,
  intercambio: OpcionesDeIntercambio['intercambio'],
): FastifyPluginAsyncZod {
  return async (app) => {
    const ver = proteger({ permiso: 'activos-fijos.saldos-iniciales.ver' });

    app.get(RUTA, { schema: { tags: etiquetas }, preHandler: ver, handler: controlador.listar });
    app.get(`${RUTA}/:activoId`, { schema: conId, preHandler: ver, handler: controlador.obtener });
    rutasDeEscritura(app, controlador);
    rutasDeIntercambio(app, { ...EN_EXCEL, intercambio });
  };
}
