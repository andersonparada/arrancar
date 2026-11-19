import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { rutasDeIntercambio, type OpcionesDeIntercambio } from '../../core/intercambio/http/rutas-de-intercambio.js';
import type { ReportesDeCajaChicaControlador } from './reportes.controlador.js';
import { esquemaFiltroAlCorte, esquemaFiltroDePeriodo } from './reportes.esquemas-http.js';

export type Intercambio = OpcionesDeIntercambio['intercambio'];

const PREFIJO = '/caja-chica/reportes';
const tags = ['Caja chica'];

export type ClaveDeReporte = 'pendientes' | 'reposiciones' | 'sinDocumento' | 'estadoDeFondos' | 'arqueos';

const REPORTES = [
  { clave: 'pendientes', ruta: 'pendientes-de-reponer', filtro: esquemaFiltroAlCorte },
  { clave: 'reposiciones', ruta: 'reposiciones', filtro: esquemaFiltroDePeriodo },
  { clave: 'sinDocumento', ruta: 'sin-documento-fiscal', filtro: esquemaFiltroDePeriodo },
  { clave: 'estadoDeFondos', ruta: 'estado-de-fondos', filtro: esquemaFiltroAlCorte },
  { clave: 'arqueos', ruta: 'arqueos', filtro: esquemaFiltroDePeriodo },
] as const;

/** CC-R1 a CC-R5: se ven con `reportes.ver` y se exportan con `reportes.exportar`; cada fondo según el alcance del usuario. */
export function rutasDeReportesDeCajaChica(
  controlador: ReportesDeCajaChicaControlador,
  excel: Record<ClaveDeReporte, Intercambio>,
): FastifyPluginAsyncZod {
  return async (app) => {
    for (const { clave, ruta, filtro } of REPORTES) {
      const completa = `${PREFIJO}/${ruta}`;
      app.get(completa, {
        schema: { tags, querystring: filtro },
        preHandler: proteger({ permiso: 'caja-chica.reportes.ver' }),
        handler: controlador[clave] as never,
      });
      rutasDeIntercambio(app, {
        ruta: completa,
        archivo: ruta,
        permisos: { exportar: 'caja-chica.reportes.exportar' },
        intercambio: excel[clave],
        filtro,
      });
    }
  };
}
