import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { ReportesDeEfectivoControlador } from './reportes-de-efectivo.controlador.js';
import {
  esquemaFiltroDeBancarizacion,
  esquemaFiltroDeNotasSinAplicar,
  esquemaFiltroDeRetirosPorLiquidar,
} from './reportes-de-efectivo.esquemas-http.js';
import { rutaDeReporte, type Intercambio, type RutaDeReporte } from './reportes-de-pagos.rutas.js';

type ClaveDeReporte = 'bancarizacion' | 'retirosPorLiquidar' | 'notasSinAplicar';

/** R9 es de control (contador, auditoría); R10 y R11 son de pagos (tesorería, contador). */
const REPORTES: Array<RutaDeReporte & { clave: ClaveDeReporte }> = [
  {
    clave: 'bancarizacion',
    ruta: 'bancarizacion',
    recurso: 'reportes-de-control',
    filtro: esquemaFiltroDeBancarizacion,
  },
  {
    clave: 'retirosPorLiquidar',
    ruta: 'retiros-por-liquidar',
    recurso: 'reportes-de-pagos',
    filtro: esquemaFiltroDeRetirosPorLiquidar,
  },
  {
    clave: 'notasSinAplicar',
    ruta: 'notas-sin-aplicar',
    recurso: 'reportes-de-pagos',
    filtro: esquemaFiltroDeNotasSinAplicar,
  },
];

/** Los reportes del efectivo y la cuenta transitoria (R9, R10 y R11): se ven, se imprimen y se exportan. */
export function rutasDeReportesDeEfectivo(
  controlador: ReportesDeEfectivoControlador,
  excel: Record<ClaveDeReporte, Intercambio>,
): FastifyPluginAsyncZod {
  return async (app) => {
    for (const reporte of REPORTES) {
      rutaDeReporte(app, { reporte, handler: controlador[reporte.clave], excel: excel[reporte.clave] });
    }
  };
}
