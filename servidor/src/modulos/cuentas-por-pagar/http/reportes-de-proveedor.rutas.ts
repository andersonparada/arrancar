import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { ZodType } from 'zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { rutasDeIntercambio, type OpcionesDeIntercambio } from '../../core/intercambio/http/rutas-de-intercambio.js';
import type { ReportesDeProveedorControlador } from './reportes-de-proveedor.controlador.js';
import {
  esquemaFiltroDeContrasenasPorPagar,
  esquemaFiltroDeEstadoDeCuenta,
  esquemaFiltroDeSaldosAFavor,
} from './reportes-de-proveedor.esquemas-http.js';

type Intercambio = OpcionesDeIntercambio['intercambio'];
type Aplicacion = Parameters<FastifyPluginAsyncZod>[0];

const PREFIJO = '/cuentas-por-pagar/reportes';
const PERMISOS = 'cuentas-por-pagar.reportes-de-saldos';
const tags = ['Cuentas por pagar'];

interface RutaDeReporte {
  ruta: string;
  archivo: string;
  filtro: ZodType;
  /** El manejador de la pantalla. */
  handler: (solicitud: never) => unknown;
  excel: Intercambio;
}

/** Una ruta de reporte con su Excel: se ve con `ver` y se exporta con `exportar`. */
function rutaDeReporte(app: Aplicacion, { ruta, archivo, filtro, handler, excel }: RutaDeReporte) {
  const completa = `${PREFIJO}/${ruta}`;
  app.get(completa, {
    schema: { tags, querystring: filtro },
    preHandler: proteger({ permiso: `${PERMISOS}.ver` }),
    handler: handler as never,
  });
  rutasDeIntercambio(app, {
    ruta: completa,
    archivo,
    permisos: { exportar: `${PERMISOS}.exportar` },
    intercambio: excel,
    filtro,
  });
}

type ClaveDeReporte = 'estadoDeCuenta' | 'saldosAFavor' | 'contrasenasPorPagar';

/** Cada reporte: su ruta (y nombre de archivo), su filtro y cómo se llama en el controlador y en los Excel. */
const REPORTES: Array<{ clave: ClaveDeReporte; ruta: string; filtro: ZodType }> = [
  { clave: 'estadoDeCuenta', ruta: 'estado-de-cuenta', filtro: esquemaFiltroDeEstadoDeCuenta },
  { clave: 'saldosAFavor', ruta: 'saldos-a-favor', filtro: esquemaFiltroDeSaldosAFavor },
  { clave: 'contrasenasPorPagar', ruta: 'contrasenas-por-pagar', filtro: esquemaFiltroDeContrasenasPorPagar },
];

/** Los reportes de un proveedor y de sus saldos a favor y contraseñas (R3, R4 y R5): se ven, se imprimen y se exportan. */
export function rutasDeReportesDeProveedor(
  controlador: ReportesDeProveedorControlador,
  excel: Record<ClaveDeReporte, Intercambio>,
): FastifyPluginAsyncZod {
  return async (app) => {
    for (const { clave, ruta, filtro } of REPORTES) {
      rutaDeReporte(app, { ruta, archivo: ruta, filtro, handler: controlador[clave], excel: excel[clave] });
    }
  };
}
