import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { ZodType } from 'zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { rutasDeIntercambio, type OpcionesDeIntercambio } from '../../core/intercambio/http/rutas-de-intercambio.js';
import type { ReportesDePagosControlador } from './reportes-de-pagos.controlador.js';
import {
  esquemaFiltroDeAjustesDelMes,
  esquemaFiltroDeChequesPosfechados,
  esquemaFiltroDePagosRealizados,
} from './reportes-de-pagos.esquemas-http.js';

export type Intercambio = OpcionesDeIntercambio['intercambio'];
type Aplicacion = Parameters<FastifyPluginAsyncZod>[0];

const PREFIJO = '/cuentas-por-pagar/reportes';
const tags = ['Cuentas por pagar'];

/** Un reporte: su ruta, el recurso de permisos (`reportes-de-pagos`, `reportes-de-control`…) y su filtro. */
export interface RutaDeReporte {
  ruta: string;
  recurso: string;
  filtro: ZodType;
}

type ClaveDeReporte = 'pagosRealizados' | 'chequesPosfechados' | 'ajustesDelMes';

/** Cada reporte de este archivo, con su clave en el controlador. */
const REPORTES: Array<RutaDeReporte & { clave: ClaveDeReporte }> = [
  { clave: 'pagosRealizados', ruta: 'pagos', recurso: 'reportes-de-pagos', filtro: esquemaFiltroDePagosRealizados },
  {
    clave: 'chequesPosfechados',
    ruta: 'cheques-posfechados',
    recurso: 'reportes-de-pagos',
    filtro: esquemaFiltroDeChequesPosfechados,
  },
  {
    clave: 'ajustesDelMes',
    ruta: 'ajustes-del-mes',
    recurso: 'reportes-de-control',
    filtro: esquemaFiltroDeAjustesDelMes,
  },
];

/** Una ruta de reporte con su Excel: se ve con `ver` y se exporta con `exportar`. */
export function rutaDeReporte(
  app: Aplicacion,
  { reporte, handler, excel }: { reporte: RutaDeReporte; handler: (solicitud: never) => unknown; excel: Intercambio },
) {
  const completa = `${PREFIJO}/${reporte.ruta}`;
  const permisos = `cuentas-por-pagar.${reporte.recurso}`;
  app.get(completa, {
    schema: { tags, querystring: reporte.filtro },
    preHandler: proteger({ permiso: `${permisos}.ver` }),
    handler: handler as never,
  });
  rutasDeIntercambio(app, {
    ruta: completa,
    archivo: reporte.ruta,
    permisos: { exportar: `${permisos}.exportar` },
    intercambio: excel,
    filtro: reporte.filtro,
  });
}

/** Los reportes de pagos y de control (R6, R7 y R8): se ven, se imprimen y se exportan. */
export function rutasDeReportesDePagos(
  controlador: ReportesDePagosControlador,
  excel: Record<ClaveDeReporte, Intercambio>,
): FastifyPluginAsyncZod {
  return async (app) => {
    for (const reporte of REPORTES) {
      rutaDeReporte(app, { reporte, handler: controlador[reporte.clave], excel: excel[reporte.clave] });
    }
  };
}
