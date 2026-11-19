import type { FastifyPluginAsync } from 'fastify';
import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { crearIntercambio } from '../../core/intercambio/contexto.js';
import type { DependenciasDeReportesDeSaldos } from '../aplicacion/casos-uso/reportes/base-del-corte.js';
import { ReporteDeDocumentosAUnaFecha } from '../aplicacion/casos-uso/reportes/reporte-de-documentos-a-una-fecha.js';
import { ReporteDeSaldosPorProveedor } from '../aplicacion/casos-uso/reportes/reporte-de-saldos-por-proveedor.js';
import {
  aFilasExportadasDeDocumentos,
  columnasDeDocumentosAUnaFecha,
  type FilaExportadaDeDocumentos,
} from '../http/documentos-a-una-fecha.columnas.js';
import { ReportesDeSaldosControlador } from '../http/reportes-de-saldos.controlador.js';
import {
  separarPaginacion,
  type FiltroDeDocumentosAUnaFechaSolicitado,
  type FiltroDeSaldosPorProveedorSolicitado,
} from '../http/reportes-de-saldos.esquemas-http.js';
import { rutasDeReportesDeSaldos } from '../http/reportes-de-saldos.rutas.js';
import {
  aFilasExportadasDeSaldos,
  columnasDeSaldosPorProveedor,
  type FilaExportadaDeSaldos,
} from '../http/saldos-por-proveedor.columnas.js';
import { CargaInicialEnMediador } from '../infraestructura/carga-inicial-en-mediador.js';
import { NotasSinAplicarDrizzle } from '../infraestructura/persistencia/notas-sin-aplicar.drizzle.js';
import { ConsultaDeSaldosAlCorte } from '../infraestructura/persistencia/saldos-al-corte.drizzle.js';

const noSeImporta = () => {
  throw new Error('Los reportes de saldos no se importan.');
};

/** El Excel de un reporte siempre lleva el filtro de la pantalla: las rutas lo validan antes. */
function conFiltro<Filtro>(filtro: Filtro | undefined): Filtro {
  if (filtro === undefined) throw new Error('El reporte necesita su filtro.');
  return filtro;
}

/** Excel de R1 y R2 con el mismo filtro que la pantalla (R2 exporta todo lo filtrado, sin paginar). */
function intercambios(saldos: ReporteDeSaldosPorProveedor, documentos: ReporteDeDocumentosAUnaFecha) {
  return {
    saldosPorProveedor: crearIntercambio<FilaExportadaDeSaldos, never, FiltroDeSaldosPorProveedorSolicitado>({
      nombre: 'Saldos por proveedor',
      columnas: columnasDeSaldosPorProveedor,
      validar: () => ({ errores: [] }),
      listar: async (operador, filtro) => aFilasExportadasDeSaldos(await saldos.ejecutar(operador, conFiltro(filtro))),
      soloExportar: true,
      crear: noSeImporta,
    }),
    documentos: crearIntercambio<FilaExportadaDeDocumentos, never, FiltroDeDocumentosAUnaFechaSolicitado>({
      nombre: 'Documentos por pagar',
      columnas: columnasDeDocumentosAUnaFecha,
      validar: () => ({ errores: [] }),
      listar: async (operador, filtro) => {
        const { solicitud } = separarPaginacion(conFiltro(filtro));
        return aFilasExportadasDeDocumentos(await documentos.ejecutar(operador, solicitud, null));
      },
      soloExportar: true,
      crear: noSeImporta,
    }),
  };
}

/** Raíz de composición de los reportes de saldos a una fecha de corte (R1 y R2): solo lectura, con sus Excel. */
export function rutasDeReportesDeSaldosComponidas(): FastifyPluginAsync {
  const { unidadDeTrabajo, reloj } = dependenciasCompartidas();
  const dependencias: DependenciasDeReportesDeSaldos = {
    unidadDeTrabajo,
    reloj,
    cargaInicial: new CargaInicialEnMediador(),
    consultas: new ConsultaDeSaldosAlCorte(),
  };
  const saldosPorProveedor = new ReporteDeSaldosPorProveedor({
    ...dependencias,
    notasSinAplicar: new NotasSinAplicarDrizzle(),
  });
  const documentos = new ReporteDeDocumentosAUnaFecha(dependencias);
  return rutasDeReportesDeSaldos(
    new ReportesDeSaldosControlador({ saldosPorProveedor, documentos }),
    intercambios(saldosPorProveedor, documentos),
  );
}
