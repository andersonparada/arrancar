import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { rutasDeIntercambio, type OpcionesDeIntercambio } from '../../core/intercambio/http/rutas-de-intercambio.js';
import type { SaldosInicialesControlador } from './saldos-iniciales.controlador.js';
import { esquemaParamsSaldoInicial, esquemaSaldoInicial } from './saldos-iniciales.esquemas-http.js';

type Aplicacion = Parameters<FastifyPluginAsyncZod>[0];

const tags = ['Inventarios'];
const RUTA = '/inventarios/saldos-iniciales';
const EN_EXCEL = {
  ruta: RUTA,
  archivo: 'saldos-iniciales-de-inventario',
  permisos: {
    importar: 'inventarios.saldos-iniciales.importar',
    exportar: 'inventarios.saldos-iniciales.exportar',
  },
};

const conId = { tags, params: esquemaParamsSaldoInicial };

/** Cada acción de escritura exige su propio permiso. */
function rutasDeEscritura(app: Aplicacion, controlador: SaldosInicialesControlador) {
  app.post(RUTA, {
    schema: { tags, body: esquemaSaldoInicial },
    preHandler: proteger({ permiso: 'inventarios.saldos-iniciales.crear' }),
    handler: controlador.registrar,
  });
  app.put(`${RUTA}/:movimientoId`, {
    schema: { ...conId, body: esquemaSaldoInicial },
    preHandler: proteger({ permiso: 'inventarios.saldos-iniciales.editar' }),
    handler: controlador.corregir,
  });
  app.delete(`${RUTA}/:movimientoId`, {
    schema: conId,
    preHandler: proteger({ permiso: 'inventarios.saldos-iniciales.eliminar' }),
    handler: controlador.eliminar,
  });
}

export function rutasSaldosIniciales(
  controlador: SaldosInicialesControlador,
  intercambio: OpcionesDeIntercambio['intercambio'],
): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(RUTA, {
      schema: { tags },
      preHandler: proteger({ permiso: 'inventarios.saldos-iniciales.ver' }),
      handler: controlador.listar,
    });
    rutasDeEscritura(app, controlador);
    rutasDeIntercambio(app, { ...EN_EXCEL, intercambio });
  };
}
