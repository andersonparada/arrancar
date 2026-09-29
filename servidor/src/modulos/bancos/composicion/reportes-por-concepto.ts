import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { crearIntercambio } from '../../core/intercambio/contexto.js';
import type { DependenciasDeReportesPorConcepto } from '../aplicacion/casos-uso/reportes-por-concepto/dependencias-de-reportes-por-concepto.js';
import {
  ReporteDeFlujoDeEfectivo,
  type FiltroDelFlujoDeEfectivo,
} from '../aplicacion/casos-uso/reportes-por-concepto/reporte-de-flujo-de-efectivo.js';
import { ReporteDeMovimientosPorConcepto } from '../aplicacion/casos-uso/reportes-por-concepto/reporte-de-movimientos-por-concepto.js';
import {
  aFilasExportadasDelFlujo,
  columnasDelFlujoDeEfectivo,
  type FilaExportadaDelFlujo,
} from '../http/flujo-de-efectivo.columnas.js';
import {
  aFilasExportadasPorConcepto,
  columnasDeMovimientosPorConcepto,
  type FilaExportadaPorConcepto,
} from '../http/movimientos-por-concepto.columnas.js';
import { ReportesPorConceptoControlador } from '../http/reportes-por-concepto.controlador.js';
import { aFiltroDeTotales, type FiltroPorConceptoSolicitado } from '../http/reportes-por-concepto.esquemas-http.js';
import { rutasReportesPorConcepto } from '../http/reportes-por-concepto.rutas.js';
import { ConsultasDeTotalesPorConceptoDrizzle } from '../infraestructura/persistencia/consultas-de-totales-por-concepto.drizzle.js';

const noSeImporta = () => {
  throw new Error('Los reportes por concepto no se importan.');
};

/** El Excel de un reporte siempre lleva el filtro de la pantalla: las rutas lo validan antes. */
function conFiltro<Filtro>(filtro: Filtro | undefined): Filtro {
  if (filtro === undefined) throw new Error('El reporte necesita su filtro.');
  return filtro;
}

/** Excel de los reportes con el mismo filtro que la pantalla; nunca se importan (son reportes). */
function intercambios(flujo: ReporteDeFlujoDeEfectivo, porConcepto: ReporteDeMovimientosPorConcepto) {
  return {
    flujoDeEfectivo: crearIntercambio<FilaExportadaDelFlujo, never, FiltroDelFlujoDeEfectivo>({
      nombre: 'Flujo de efectivo',
      columnas: columnasDelFlujoDeEfectivo,
      validar: () => ({ errores: [] }),
      listar: async (operador, filtro) => aFilasExportadasDelFlujo(await flujo.ejecutar(operador, conFiltro(filtro))),
      crear: noSeImporta,
    }),
    movimientosPorConcepto: crearIntercambio<FilaExportadaPorConcepto, never, FiltroPorConceptoSolicitado>({
      nombre: 'Movimientos por concepto',
      columnas: columnasDeMovimientosPorConcepto,
      validar: () => ({ errores: [] }),
      listar: async (operador, filtro) =>
        aFilasExportadasPorConcepto(await porConcepto.ejecutar(operador, aFiltroDeTotales(conFiltro(filtro)))),
      crear: noSeImporta,
    }),
  };
}

/** Raíz de composición de los reportes por concepto: solo lectura, con sus dos Excel. */
export function rutasDeReportesPorConcepto() {
  const { unidadDeTrabajo } = dependenciasCompartidas();
  const dependencias: DependenciasDeReportesPorConcepto = {
    unidadDeTrabajo,
    consultas: new ConsultasDeTotalesPorConceptoDrizzle(),
  };
  const flujoDeEfectivo = new ReporteDeFlujoDeEfectivo(dependencias);
  const movimientosPorConcepto = new ReporteDeMovimientosPorConcepto(dependencias);
  return rutasReportesPorConcepto(
    new ReportesPorConceptoControlador({ flujoDeEfectivo, movimientosPorConcepto }),
    intercambios(flujoDeEfectivo, movimientosPorConcepto),
  );
}
