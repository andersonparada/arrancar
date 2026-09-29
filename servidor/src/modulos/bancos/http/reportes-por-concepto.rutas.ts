import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { rutasDeIntercambio, type OpcionesDeIntercambio } from '../../core/intercambio/http/rutas-de-intercambio.js';
import type { ReportesPorConceptoControlador } from './reportes-por-concepto.controlador.js';
import {
  esquemaFiltroDeFlujoDeEfectivo,
  esquemaFiltroDeMovimientosPorConcepto,
} from './reportes-por-concepto.esquemas-http.js';

type Intercambio = OpcionesDeIntercambio['intercambio'];

const RUTA_DEL_FLUJO = '/bancos/flujo-de-efectivo';
const RUTA_POR_CONCEPTO = '/bancos/movimientos-por-concepto';

type Aplicacion = Parameters<FastifyPluginAsyncZod>[0];

function rutasDelFlujo(app: Aplicacion, controlador: ReportesPorConceptoControlador, intercambio: Intercambio) {
  app.get(RUTA_DEL_FLUJO, {
    schema: { tags: ['Bancos'], querystring: esquemaFiltroDeFlujoDeEfectivo },
    preHandler: proteger({ permiso: 'bancos.flujo-de-efectivo.ver' }),
    handler: controlador.flujoDeEfectivo,
  });
  rutasDeIntercambio(app, {
    ruta: RUTA_DEL_FLUJO,
    archivo: 'flujo-de-efectivo',
    permisos: { exportar: 'bancos.flujo-de-efectivo.exportar' },
    intercambio,
    filtro: esquemaFiltroDeFlujoDeEfectivo,
  });
}

function rutasPorConcepto(app: Aplicacion, controlador: ReportesPorConceptoControlador, intercambio: Intercambio) {
  app.get(RUTA_POR_CONCEPTO, {
    schema: { tags: ['Bancos'], querystring: esquemaFiltroDeMovimientosPorConcepto },
    preHandler: proteger({ permiso: 'bancos.movimientos.ver' }),
    handler: controlador.movimientosPorConcepto,
  });
  rutasDeIntercambio(app, {
    ruta: RUTA_POR_CONCEPTO,
    archivo: 'movimientos-por-concepto',
    permisos: { exportar: 'bancos.movimientos.exportar' },
    intercambio,
    filtro: esquemaFiltroDeMovimientosPorConcepto,
  });
}

/**
 * Flujo de efectivo (método directo) y Movimientos por concepto: reportes de solo lectura. El primero tiene sus
 * permisos; el segundo reutiliza los del reporte de movimientos.
 */
export function rutasReportesPorConcepto(
  controlador: ReportesPorConceptoControlador,
  intercambios: { flujoDeEfectivo: Intercambio; movimientosPorConcepto: Intercambio },
): FastifyPluginAsyncZod {
  return async (app) => {
    rutasDelFlujo(app, controlador, intercambios.flujoDeEfectivo);
    rutasPorConcepto(app, controlador, intercambios.movimientosPorConcepto);
  };
}
