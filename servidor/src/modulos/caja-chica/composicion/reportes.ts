import type { FastifyPluginAsync } from 'fastify';
import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { PoliticaDeZonaHorariaEnConfiguracion } from '../../core/compartido/infraestructura/politica-de-zona-horaria.configuracion.js';
import type { Columna } from '../../core/intercambio/aplicacion/columnas.js';
import { crearIntercambio } from '../../core/intercambio/contexto.js';
import { ReporteDeReposiciones } from '../aplicacion/casos-uso/reportes/reporte-de-reposiciones.js';
import {
  ReporteDeGastosSinDocumento,
  ReporteDePendientesDeReponer,
  type DependenciasDeReportes,
} from '../aplicacion/casos-uso/reportes/reportes-de-comprobantes.js';
import {
  ReporteDeArqueos,
  ReporteDeEstadoDeFondos,
} from '../aplicacion/casos-uso/reportes/reportes-de-fondos-y-arqueos.js';
import {
  aFilasExportadasDePendientes,
  aFilasExportadasSinDocumento,
  columnasDePendientes,
  columnasSinDocumento,
} from '../http/comprobantes-de-reporte.columnas.js';
import {
  aFilasExportadasDeArqueos,
  aFilasExportadasDeEstadoDeFondos,
  columnasDeArqueos,
  columnasDeEstadoDeFondos,
} from '../http/fondos-y-arqueos-de-reporte.columnas.js';
import type { FiltroAlCorteSolicitado, FiltroDePeriodoSolicitado } from '../http/reportes.esquemas-http.js';
import { ReportesDeCajaChicaControlador } from '../http/reportes.controlador.js';
import { rutasDeReportesDeCajaChica } from '../http/reportes.rutas.js';
import { aFilasExportadasDeReposiciones, columnasDeReposiciones } from '../http/reposiciones-de-reporte.columnas.js';
import { LecturasDeReportesDeCajaChicaDrizzle } from '../infraestructura/persistencia/lecturas-de-reportes.drizzle.js';

type AlCorte = FiltroAlCorteSolicitado;
type DelPeriodo = FiltroDePeriodoSolicitado;

const noSeImporta = () => {
  throw new Error('Los reportes no se importan.');
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
    soloExportar: true,
    crear: noSeImporta,
  });
}

function dependencias(): DependenciasDeReportes {
  const { unidadDeTrabajo, reloj } = dependenciasCompartidas();
  return {
    unidadDeTrabajo,
    reloj,
    lecturas: new LecturasDeReportesDeCajaChicaDrizzle(),
    zonaHoraria: new PoliticaDeZonaHorariaEnConfiguracion(),
  };
}

type Casos = ConstructorParameters<typeof ReportesDeCajaChicaControlador>[0];

/** El Excel de cada reporte: las mismas filas de la pantalla, sin importar nada. */
function excelDe(casos: Casos) {
  return {
    pendientes: intercambioDe('Pendientes de reponer', columnasDePendientes, async (o, f: AlCorte) =>
      aFilasExportadasDePendientes(await casos.pendientes.ejecutar(o, f)),
    ),
    reposiciones: intercambioDe('Reposiciones', columnasDeReposiciones, async (o, f: DelPeriodo) =>
      aFilasExportadasDeReposiciones(await casos.reposiciones.ejecutar(o, f)),
    ),
    sinDocumento: intercambioDe('Gastos sin documento fiscal', columnasSinDocumento, async (o, f: DelPeriodo) =>
      aFilasExportadasSinDocumento(await casos.sinDocumento.ejecutar(o, f)),
    ),
    estadoDeFondos: intercambioDe('Estado de los fondos', columnasDeEstadoDeFondos, async (o, f: AlCorte) =>
      aFilasExportadasDeEstadoDeFondos(await casos.estadoDeFondos.ejecutar(o, f)),
    ),
    arqueos: intercambioDe('Arqueos', columnasDeArqueos, async (o, f: DelPeriodo) =>
      aFilasExportadasDeArqueos(await casos.arqueos.ejecutar(o, f)),
    ),
  };
}

/** Raíz de composición de CC-R1 a CC-R5: solo lectura; cada uno con su Excel. */
export function rutasDeReportesDeCajaChicaComponidas(): FastifyPluginAsync {
  const deps = dependencias();
  const casos: Casos = {
    pendientes: new ReporteDePendientesDeReponer(deps),
    reposiciones: new ReporteDeReposiciones(deps),
    sinDocumento: new ReporteDeGastosSinDocumento(deps),
    estadoDeFondos: new ReporteDeEstadoDeFondos(deps),
    arqueos: new ReporteDeArqueos(deps),
  };
  return rutasDeReportesDeCajaChica(new ReportesDeCajaChicaControlador(casos), excelDe(casos));
}
