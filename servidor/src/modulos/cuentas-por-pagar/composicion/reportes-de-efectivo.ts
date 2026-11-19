import type { FastifyPluginAsync } from 'fastify';
import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import {
  ReporteDeBancarizacion,
  type DependenciasDeBancarizacion,
} from '../aplicacion/casos-uso/reportes/reporte-de-bancarizacion.js';
import {
  ReporteDeNotasSinAplicar,
  ReporteDeRetirosPorLiquidar,
  type DependenciasDeReportesDeEfectivo,
} from '../aplicacion/casos-uso/reportes/reportes-de-efectivo.js';
import {
  aFilasExportadasDeBancarizacion,
  columnasDeBancarizacion,
  type FilaExportadaDeBancarizacion,
} from '../http/bancarizacion.columnas.js';
import {
  aFilasExportadasDeNotas,
  columnasDeNotasSinAplicar,
  type FilaExportadaDeNotas,
} from '../http/notas-sin-aplicar.columnas.js';
import { ReportesDeEfectivoControlador } from '../http/reportes-de-efectivo.controlador.js';
import type {
  FiltroDeBancarizacionSolicitado,
  FiltroDeNotasSinAplicarSolicitado,
  FiltroDeRetirosPorLiquidarSolicitado,
} from '../http/reportes-de-efectivo.esquemas-http.js';
import { rutasDeReportesDeEfectivo } from '../http/reportes-de-efectivo.rutas.js';
import {
  aFilasExportadasDeRetiros,
  columnasDeRetirosPorLiquidar,
  type FilaExportadaDeRetiros,
} from '../http/retiros-por-liquidar.columnas.js';
import { CargaInicialEnMediador } from '../infraestructura/carga-inicial-en-mediador.js';
import { BancarizacionDelReporteDrizzle } from '../infraestructura/persistencia/bancarizacion-del-reporte.drizzle.js';
import { ConsultasDePagosDrizzle } from '../infraestructura/persistencia/consultas-de-pagos.drizzle.js';
import { ConsultasDeRetirosDrizzle } from '../infraestructura/persistencia/consultas-de-retiros.drizzle.js';
import { DatosFiscalesDeLaEmpresaDrizzle } from '../infraestructura/persistencia/lecturas-del-libro.drizzle.js';
import { NotasSinAplicarDrizzle } from '../infraestructura/persistencia/notas-sin-aplicar.drizzle.js';
import { ConsultaDeSaldosAlCorte } from '../infraestructura/persistencia/saldos-al-corte.drizzle.js';
import { UmbralDeBancarizacionEnConfiguracion } from '../infraestructura/umbral-de-bancarizacion-en-configuracion.js';
import { intercambioDe } from './reportes-de-pagos.js';

interface Reportes {
  bancarizacion: ReporteDeBancarizacion;
  retirosPorLiquidar: ReporteDeRetirosPorLiquidar;
  notasSinAplicar: ReporteDeNotasSinAplicar;
}

/** Excel de R9, R10 y R11 con el mismo filtro que la pantalla. */
function intercambios({ bancarizacion, retirosPorLiquidar, notasSinAplicar }: Reportes) {
  return {
    bancarizacion: intercambioDe<FilaExportadaDeBancarizacion, FiltroDeBancarizacionSolicitado>(
      'Pagos en efectivo sobre el umbral',
      columnasDeBancarizacion,
      async (operador, filtro) => aFilasExportadasDeBancarizacion(await bancarizacion.ejecutar(operador, filtro)),
    ),
    retirosPorLiquidar: intercambioDe<FilaExportadaDeRetiros, FiltroDeRetirosPorLiquidarSolicitado>(
      'Retiros de efectivo por liquidar',
      columnasDeRetirosPorLiquidar,
      async (operador, filtro) => aFilasExportadasDeRetiros(await retirosPorLiquidar.ejecutar(operador, filtro)),
    ),
    notasSinAplicar: intercambioDe<FilaExportadaDeNotas, FiltroDeNotasSinAplicarSolicitado>(
      'Notas de débito sin aplicar',
      columnasDeNotasSinAplicar,
      async (operador, filtro) => aFilasExportadasDeNotas(await notasSinAplicar.ejecutar(operador, filtro)),
    ),
  };
}

/** Lo que comparten los tres reportes: la unidad de trabajo, el reloj, la carga inicial y la base de los cortes. */
function baseDeLosReportes() {
  const { unidadDeTrabajo, reloj } = dependenciasCompartidas();
  return {
    unidadDeTrabajo,
    reloj,
    cargaInicial: new CargaInicialEnMediador(),
    consultas: new ConsultaDeSaldosAlCorte(),
  };
}

function bancarizacionDe(): ReporteDeBancarizacion {
  const dependencias: DependenciasDeBancarizacion = {
    ...baseDeLosReportes(),
    consultasDeBancarizacion: new BancarizacionDelReporteDrizzle(),
    consultasDePagos: new ConsultasDePagosDrizzle(),
    fiscal: new DatosFiscalesDeLaEmpresaDrizzle(),
    umbral: new UmbralDeBancarizacionEnConfiguracion(),
  };
  return new ReporteDeBancarizacion(dependencias);
}

/** Raíz de composición de R9, R10 y R11 (efectivo sobre el umbral, retiros por liquidar y notas sin aplicar): solo lectura. */
export function rutasDeReportesDeEfectivoComponidas(): FastifyPluginAsync {
  const deEfectivo: DependenciasDeReportesDeEfectivo = {
    ...baseDeLosReportes(),
    consultasDeRetiros: new ConsultasDeRetirosDrizzle(),
    notasSinAplicar: new NotasSinAplicarDrizzle(),
  };
  const reportes: Reportes = {
    bancarizacion: bancarizacionDe(),
    retirosPorLiquidar: new ReporteDeRetirosPorLiquidar(deEfectivo),
    notasSinAplicar: new ReporteDeNotasSinAplicar(deEfectivo),
  };
  return rutasDeReportesDeEfectivo(new ReportesDeEfectivoControlador(reportes), intercambios(reportes));
}
