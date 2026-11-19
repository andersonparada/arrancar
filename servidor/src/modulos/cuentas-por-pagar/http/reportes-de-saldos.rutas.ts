import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { proteger } from '../../core/compartido/http/guardias.js';
import { rutasDeIntercambio, type OpcionesDeIntercambio } from '../../core/intercambio/http/rutas-de-intercambio.js';
import type { ReportesDeSaldosControlador } from './reportes-de-saldos.controlador.js';
import {
  esquemaFiltroDeDocumentosAUnaFecha,
  esquemaFiltroDeSaldosPorProveedor,
} from './reportes-de-saldos.esquemas-http.js';

type Intercambio = OpcionesDeIntercambio['intercambio'];
type Aplicacion = Parameters<FastifyPluginAsyncZod>[0];

const PREFIJO = '/cuentas-por-pagar/reportes';
const PERMISOS = 'cuentas-por-pagar.reportes-de-saldos';
const tags = ['Cuentas por pagar'];

/** El archivo de un reporte a una fecha de corte lleva ese corte en el nombre. */
const corteDelNombre = (consulta: Record<string, unknown>) =>
  typeof consulta.corte === 'string' ? consulta.corte : undefined;

function rutasDeSaldosPorProveedor(app: Aplicacion, controlador: ReportesDeSaldosControlador, excel: Intercambio) {
  const ruta = `${PREFIJO}/saldos-por-proveedor`;
  app.get(ruta, {
    schema: { tags, querystring: esquemaFiltroDeSaldosPorProveedor },
    preHandler: proteger({ permiso: `${PERMISOS}.ver` }),
    handler: controlador.saldosPorProveedor,
  });
  rutasDeIntercambio(app, {
    ruta,
    archivo: 'saldos-por-proveedor',
    permisos: { exportar: `${PERMISOS}.exportar` },
    intercambio: excel,
    filtro: esquemaFiltroDeSaldosPorProveedor,
    fechaDelNombre: corteDelNombre,
  });
}

function rutasDeDocumentos(app: Aplicacion, controlador: ReportesDeSaldosControlador, excel: Intercambio) {
  const ruta = `${PREFIJO}/documentos`;
  app.get(ruta, {
    schema: { tags, querystring: esquemaFiltroDeDocumentosAUnaFecha },
    preHandler: proteger({ permiso: `${PERMISOS}.ver` }),
    handler: controlador.documentos,
  });
  rutasDeIntercambio(app, {
    ruta,
    archivo: 'documentos-por-pagar',
    permisos: { exportar: `${PERMISOS}.exportar` },
    intercambio: excel,
    filtro: esquemaFiltroDeDocumentosAUnaFecha,
    fechaDelNombre: corteDelNombre,
  });
}

/** Los reportes de saldos a una fecha de corte (R1 y R2): se ven con `ver` y se exportan con `exportar`; no se importan. */
export function rutasDeReportesDeSaldos(
  controlador: ReportesDeSaldosControlador,
  excel: { saldosPorProveedor: Intercambio; documentos: Intercambio },
): FastifyPluginAsyncZod {
  return async (app) => {
    rutasDeSaldosPorProveedor(app, controlador, excel.saldosPorProveedor);
    rutasDeDocumentos(app, controlador, excel.documentos);
  };
}
