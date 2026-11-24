import type { FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { AccesoDenegado } from '../../core/compartido/aplicacion/errores.js';
import { contextoDe } from '../../core/compartido/http/contexto-de-la-solicitud.js';
import { rutasDeIntercambio, type OpcionesDeIntercambio } from '../../core/intercambio/http/rutas-de-intercambio.js';
import { PERMISO_VER_COSTOS } from './vista-de-la-solicitud.js';
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

/**
 * El Excel lleva el costo de cada renglón: sin `costos.ver` no se exporta (INV-A7). La guardia va después de la de
 * sesión y permiso de la ruta (`onRoute` la agrega al final), así que quien no entró sigue viendo 401 o 403 como siempre.
 */
function exigirCostosParaExportar(app: Aplicacion) {
  app.addHook('onRoute', (ruta) => {
    if (!ruta.url.endsWith('/exportar')) return;
    const guardias = [ruta.preHandler ?? []].flat();
    ruta.preHandler = [...guardias, exigirVerCostos];
  });
}

async function exigirVerCostos(solicitud: FastifyRequest): Promise<void> {
  if (!contextoDe(solicitud).permisos.has(PERMISO_VER_COSTOS)) {
    throw new AccesoDenegado('Para exportar los saldos iniciales necesita el permiso de ver costos.');
  }
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
    exigirCostosParaExportar(app);
    rutasDeIntercambio(app, { ...EN_EXCEL, intercambio });
  };
}
