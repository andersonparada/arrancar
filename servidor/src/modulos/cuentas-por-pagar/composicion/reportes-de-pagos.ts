import type { FastifyPluginAsync } from 'fastify';
import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import type { Columna } from '../../core/intercambio/aplicacion/columnas.js';
import { crearIntercambio } from '../../core/intercambio/contexto.js';
import { ReporteDeAjustesDelMes } from '../aplicacion/casos-uso/reportes/reporte-de-ajustes-del-mes.js';
import { ReporteDeChequesPosfechados } from '../aplicacion/casos-uso/reportes/reporte-de-cheques-posfechados.js';
import {
  ReporteDePagosRealizados,
  type DependenciasDeReportesDePagos,
} from '../aplicacion/casos-uso/reportes/reporte-de-pagos-realizados.js';
import type { DependenciasDeReportesDeControl } from '../aplicacion/casos-uso/reportes/reporte-de-ajustes-del-mes.js';
import {
  aFilasExportadasDeAjustes,
  columnasDeAjustesDelMes,
  type FilaExportadaDeAjustes,
} from '../http/ajustes-del-mes.columnas.js';
import {
  aFilasExportadasDeCheques,
  columnasDeChequesPosfechados,
  type FilaExportadaDeCheques,
} from '../http/cheques-posfechados.columnas.js';
import {
  aFilasExportadasDePagos,
  columnasDePagosRealizados,
  type FilaExportadaDePagos,
} from '../http/pagos-realizados.columnas.js';
import { ReportesDePagosControlador } from '../http/reportes-de-pagos.controlador.js';
import {
  separarPaginacionDePagos,
  type FiltroDeAjustesDelMesSolicitado,
  type FiltroDeChequesPosfechadosSolicitado,
  type FiltroDePagosRealizadosSolicitado,
} from '../http/reportes-de-pagos.esquemas-http.js';
import { rutasDeReportesDePagos } from '../http/reportes-de-pagos.rutas.js';
import { CargaInicialEnMediador } from '../infraestructura/carga-inicial-en-mediador.js';
import { ConsultaDeReportesDeControl } from '../infraestructura/persistencia/consulta-de-reportes-de-control.drizzle.js';
import { ConsultaDeReportesDePagos } from '../infraestructura/persistencia/consulta-de-reportes-de-pagos.drizzle.js';
import { ConsultaDeSaldosAlCorte } from '../infraestructura/persistencia/saldos-al-corte.drizzle.js';

const noSeImporta = () => {
  throw new Error('Los reportes de pagos y de control no se importan.');
};

/** El Excel de un reporte siempre lleva el filtro de la pantalla: las rutas lo validan antes. */
function conFiltro<Filtro>(filtro: Filtro | undefined): Filtro {
  if (filtro === undefined) throw new Error('El reporte necesita su filtro.');
  return filtro;
}

/** El Excel de un reporte con el mismo filtro que la pantalla. */
function intercambioDe<Fila extends object, Filtro>(
  nombre: string,
  columnas: Columna[],
  listar: (operador: Operador, filtro: Filtro) => Promise<Fila[]>,
) {
  return crearIntercambio<Fila, never, Filtro>({
    nombre,
    columnas,
    validar: () => ({ errores: [] }),
    listar: (operador, filtro) => listar(operador, conFiltro(filtro)),
    crear: noSeImporta,
  });
}

interface Reportes {
  pagosRealizados: ReporteDePagosRealizados;
  chequesPosfechados: ReporteDeChequesPosfechados;
  ajustesDelMes: ReporteDeAjustesDelMes;
}

/** Excel de R6 (todo lo filtrado, sin paginar), R7 y R8. */
function intercambios({ pagosRealizados, chequesPosfechados, ajustesDelMes }: Reportes) {
  return {
    pagosRealizados: intercambioDe<FilaExportadaDePagos, FiltroDePagosRealizadosSolicitado>(
      'Pagos realizados',
      columnasDePagosRealizados,
      async (operador, filtro) =>
        aFilasExportadasDePagos(
          await pagosRealizados.ejecutar(operador, separarPaginacionDePagos(filtro).solicitud, null),
        ),
    ),
    chequesPosfechados: intercambioDe<FilaExportadaDeCheques, FiltroDeChequesPosfechadosSolicitado>(
      'Cheques posfechados',
      columnasDeChequesPosfechados,
      async (operador, filtro) => aFilasExportadasDeCheques(await chequesPosfechados.ejecutar(operador, filtro)),
    ),
    ajustesDelMes: intercambioDe<FilaExportadaDeAjustes, FiltroDeAjustesDelMesSolicitado>(
      'Ajustes del mes',
      columnasDeAjustesDelMes,
      async (operador, filtro) => aFilasExportadasDeAjustes(await ajustesDelMes.ejecutar(operador, filtro)),
    ),
  };
}

/** Raíz de composición de R6, R7 y R8 (pagos realizados, cheques posfechados y ajustes del mes): solo lectura, con Excel. */
export function rutasDeReportesDePagosComponidas(): FastifyPluginAsync {
  const { unidadDeTrabajo, reloj } = dependenciasCompartidas();
  const base = {
    unidadDeTrabajo,
    reloj,
    cargaInicial: new CargaInicialEnMediador(),
    consultas: new ConsultaDeSaldosAlCorte(),
  };
  const dePagos: DependenciasDeReportesDePagos = { ...base, consultasDePagos: new ConsultaDeReportesDePagos() };
  const deControl: DependenciasDeReportesDeControl = { ...base, consultasDeControl: new ConsultaDeReportesDeControl() };
  const reportes: Reportes = {
    pagosRealizados: new ReporteDePagosRealizados(dePagos),
    chequesPosfechados: new ReporteDeChequesPosfechados(dePagos),
    ajustesDelMes: new ReporteDeAjustesDelMes(deControl),
  };
  return rutasDeReportesDePagos(new ReportesDePagosControlador(reportes), intercambios(reportes));
}
