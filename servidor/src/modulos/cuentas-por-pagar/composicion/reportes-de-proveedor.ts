import type { FastifyPluginAsync } from 'fastify';
import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import type { Columna } from '../../core/intercambio/aplicacion/columnas.js';
import { crearIntercambio } from '../../core/intercambio/contexto.js';
import { ReporteDeContrasenasPorPagar } from '../aplicacion/casos-uso/reportes/reporte-de-contrasenas-por-pagar.js';
import {
  ReporteDeEstadoDeCuenta,
  type DependenciasDeReportesDeProveedor,
} from '../aplicacion/casos-uso/reportes/reporte-de-estado-de-cuenta.js';
import { ReporteDeSaldosAFavor } from '../aplicacion/casos-uso/reportes/reporte-de-saldos-a-favor.js';
import {
  aFilasExportadasDeContrasenas,
  columnasDeContrasenasPorPagar,
  type FilaExportadaDeContrasenas,
} from '../http/contrasenas-por-pagar.columnas.js';
import {
  aFilasExportadasDeEstadoDeCuenta,
  columnasDeEstadoDeCuenta,
  type FilaExportadaDeEstadoDeCuenta,
} from '../http/estado-de-cuenta.columnas.js';
import { ReportesDeProveedorControlador } from '../http/reportes-de-proveedor.controlador.js';
import type {
  FiltroDeContrasenasPorPagarSolicitado,
  FiltroDeEstadoDeCuentaSolicitado,
  FiltroDeSaldosAFavorSolicitado,
} from '../http/reportes-de-proveedor.esquemas-http.js';
import { rutasDeReportesDeProveedor } from '../http/reportes-de-proveedor.rutas.js';
import {
  aFilasExportadasDeSaldosAFavor,
  columnasDeSaldosAFavor,
  type FilaExportadaDeSaldosAFavor,
} from '../http/saldos-a-favor.columnas.js';
import { CargaInicialEnMediador } from '../infraestructura/carga-inicial-en-mediador.js';
import { ConsultaDeSaldosAlCorte } from '../infraestructura/persistencia/saldos-al-corte.drizzle.js';

const noSeImporta = () => {
  throw new Error('Los reportes de proveedor no se importan.');
};

/** El Excel de un reporte siempre lleva el filtro de la pantalla: las rutas lo validan antes. */
function conFiltro<Filtro>(filtro: Filtro | undefined): Filtro {
  if (filtro === undefined) throw new Error('El reporte necesita su filtro.');
  return filtro;
}

interface Reportes {
  estadoDeCuenta: ReporteDeEstadoDeCuenta;
  saldosAFavor: ReporteDeSaldosAFavor;
  contrasenasPorPagar: ReporteDeContrasenasPorPagar;
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

/** Excel de R3 (sin tope de líneas), R4 y R5. */
function intercambios({ estadoDeCuenta, saldosAFavor, contrasenasPorPagar }: Reportes) {
  return {
    estadoDeCuenta: intercambioDe<FilaExportadaDeEstadoDeCuenta, FiltroDeEstadoDeCuentaSolicitado>(
      'Estado de cuenta',
      columnasDeEstadoDeCuenta,
      async (operador, filtro) =>
        aFilasExportadasDeEstadoDeCuenta(await estadoDeCuenta.ejecutar(operador, filtro, { sinTope: true })),
    ),
    saldosAFavor: intercambioDe<FilaExportadaDeSaldosAFavor, FiltroDeSaldosAFavorSolicitado>(
      'Saldos a favor',
      columnasDeSaldosAFavor,
      async (operador, filtro) => aFilasExportadasDeSaldosAFavor(await saldosAFavor.ejecutar(operador, filtro)),
    ),
    contrasenasPorPagar: intercambioDe<FilaExportadaDeContrasenas, FiltroDeContrasenasPorPagarSolicitado>(
      'Contraseñas por pagar',
      columnasDeContrasenasPorPagar,
      async (operador, filtro) => aFilasExportadasDeContrasenas(await contrasenasPorPagar.ejecutar(operador, filtro)),
    ),
  };
}

/** Raíz de composición de R3, R4 y R5 (estado de cuenta, saldos a favor y contraseñas por pagar): solo lectura, con Excel. */
export function rutasDeReportesDeProveedorComponidas(): FastifyPluginAsync {
  const { unidadDeTrabajo, reloj } = dependenciasCompartidas();
  const consultas = new ConsultaDeSaldosAlCorte();
  const dependencias: DependenciasDeReportesDeProveedor = {
    unidadDeTrabajo,
    reloj,
    cargaInicial: new CargaInicialEnMediador(),
    consultas,
    consultasDeProveedor: consultas,
  };
  const reportes: Reportes = {
    estadoDeCuenta: new ReporteDeEstadoDeCuenta(dependencias),
    saldosAFavor: new ReporteDeSaldosAFavor(dependencias),
    contrasenasPorPagar: new ReporteDeContrasenasPorPagar(dependencias),
  };
  return rutasDeReportesDeProveedor(new ReportesDeProveedorControlador(reportes), intercambios(reportes));
}
