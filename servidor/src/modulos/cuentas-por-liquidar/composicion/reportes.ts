import type { FastifyPluginAsync } from 'fastify';
import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import type { Columna } from '../../core/intercambio/aplicacion/columnas.js';
import { crearIntercambio } from '../../core/intercambio/contexto.js';
import { ReporteDeAnticiposPorLiquidar } from '../aplicacion/casos-uso/reportes/reporte-de-anticipos-por-liquidar.js';
import { ReporteDeNoLiquidado } from '../aplicacion/casos-uso/reportes/reporte-de-no-liquidado.js';
import {
  aFilasExportadasDeAnticiposPorLiquidar,
  columnasDeAnticiposPorLiquidar,
  type FilaExportadaDeAnticiposPorLiquidar,
} from '../http/anticipos-por-liquidar.columnas.js';
import {
  aFilasExportadasDeNoLiquidado,
  columnasDeNoLiquidado,
  type FilaExportadaDeNoLiquidado,
} from '../http/no-liquidado.columnas.js';
import { ReportesDeLiquidarControlador } from '../http/reportes.controlador.js';
import type {
  FiltroDeAnticiposPorLiquidarSolicitado,
  FiltroDeNoLiquidadoSolicitado,
} from '../http/reportes.esquemas-http.js';
import { rutasDeReportesDeLiquidar } from '../http/reportes.rutas.js';
import { ConsultasDeAnticiposDrizzle } from '../infraestructura/persistencia/consultas-de-anticipos.drizzle.js';
import { LecturasDeReportesDeAnticiposDrizzle } from '../infraestructura/persistencia/lecturas-de-reportes.drizzle.js';

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

function casosDeUso() {
  const { unidadDeTrabajo, reloj } = dependenciasCompartidas();
  return {
    anticiposPorLiquidar: new ReporteDeAnticiposPorLiquidar({
      unidadDeTrabajo,
      reloj,
      consultas: new ConsultasDeAnticiposDrizzle(),
    }),
    noLiquidado: new ReporteDeNoLiquidado({
      unidadDeTrabajo,
      reloj,
      lecturas: new LecturasDeReportesDeAnticiposDrizzle(),
    }),
  };
}

/** Raíz de composición de CL-R1 y CL-R2: solo lectura; cada uno con su Excel. */
export function rutasDeReportesDeLiquidarComponidas(): FastifyPluginAsync {
  const { anticiposPorLiquidar, noLiquidado } = casosDeUso();
  return rutasDeReportesDeLiquidar(new ReportesDeLiquidarControlador({ anticiposPorLiquidar, noLiquidado }), {
    anticiposPorLiquidar: intercambioDe<FilaExportadaDeAnticiposPorLiquidar, FiltroDeAnticiposPorLiquidarSolicitado>(
      'Anticipos por liquidar',
      columnasDeAnticiposPorLiquidar,
      async (operador, filtro) =>
        aFilasExportadasDeAnticiposPorLiquidar(await anticiposPorLiquidar.ejecutar(operador, filtro)),
    ),
    noLiquidado: intercambioDe<FilaExportadaDeNoLiquidado, FiltroDeNoLiquidadoSolicitado>(
      'Anticipos no liquidados',
      columnasDeNoLiquidado,
      async (operador, filtro) => aFilasExportadasDeNoLiquidado(await noLiquidado.ejecutar(operador, filtro)),
    ),
  });
}
