import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { rutasDeIntercambio, type OpcionesDeIntercambio } from '../../core/intercambio/http/rutas-de-intercambio.js';
import type { ReportesDeLiquidarControlador } from './reportes.controlador.js';
import { esquemaFiltroDeAnticiposPorLiquidar, esquemaFiltroDeNoLiquidado } from './reportes.esquemas-http.js';

export type Intercambio = OpcionesDeIntercambio['intercambio'];

const PREFIJO = '/cuentas-por-liquidar/reportes';
const tags = ['Cuentas por liquidar'];

type ClaveDeReporte = 'anticiposPorLiquidar' | 'noLiquidado';

const REPORTES = [
  { clave: 'anticiposPorLiquidar', ruta: 'anticipos-por-liquidar', filtro: esquemaFiltroDeAnticiposPorLiquidar },
  { clave: 'noLiquidado', ruta: 'no-liquidado', filtro: esquemaFiltroDeNoLiquidado },
] as const;

/** CL-R1 y CL-R2: se ven con `reportes.ver` y se exportan con `reportes.exportar`. */
export function rutasDeReportesDeLiquidar(
  controlador: ReportesDeLiquidarControlador,
  excel: Record<ClaveDeReporte, Intercambio>,
): FastifyPluginAsyncZod {
  return async (app) => {
    for (const { clave, ruta, filtro } of REPORTES) {
      const completa = `${PREFIJO}/${ruta}`;
      app.get(completa, {
        schema: { tags, querystring: filtro },
        preHandler: proteger({ permiso: 'cuentas-por-liquidar.reportes.ver' }),
        handler: controlador[clave] as never,
      });
      rutasDeIntercambio(app, {
        ruta: completa,
        archivo: ruta,
        permisos: { exportar: 'cuentas-por-liquidar.reportes.exportar' },
        intercambio: excel[clave],
        filtro,
      });
    }
  };
}
