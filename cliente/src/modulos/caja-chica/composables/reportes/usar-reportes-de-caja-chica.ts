import { apiReportesDeCajaChica as api } from '../../servicios/reportes.api';
import {
  cantidadDeFiltrosAlCorte,
  cantidadDeFiltrosDePeriodo,
  consultaAlCorte,
  consultaDePeriodo,
  erroresDelCorte,
  erroresDelPeriodo,
  filtrosAlCorteIniciales,
  filtrosDePeriodoIniciales,
} from './filtros-de-reportes';
import { usarReporte } from './usar-reporte';

const alCorte = {
  inicial: filtrosAlCorteIniciales,
  consulta: consultaAlCorte,
  errores: erroresDelCorte,
  cantidadDeFiltros: cantidadDeFiltrosAlCorte,
};

const delPeriodo = {
  inicial: filtrosDePeriodoIniciales,
  consulta: consultaDePeriodo,
  errores: erroresDelPeriodo,
  cantidadDeFiltros: cantidadDeFiltrosDePeriodo,
};

/** CC-R1: los comprobantes pendientes de reponer al corte. */
export const usarPendientesDeReponer = () =>
  usarReporte({
    ...alCorte,
    pedir: (consulta) => api.pendientes(consulta),
    intercambio: api.intercambioDePendientes,
    siFalla: 'No se pudo cargar el reporte de pendientes de reponer.',
  });

/** CC-R2: las reposiciones del período por concepto. */
export const usarReposicionesDelPeriodo = () =>
  usarReporte({
    ...delPeriodo,
    pedir: (consulta) => api.reposiciones(consulta),
    intercambio: api.intercambioDeReposiciones,
    siFalla: 'No se pudo cargar el reporte de reposiciones.',
  });

/** CC-R3: los gastos sin documento fiscal del período. */
export const usarGastosSinDocumento = () =>
  usarReporte({
    ...delPeriodo,
    pedir: (consulta) => api.sinDocumento(consulta),
    intercambio: api.intercambioSinDocumento,
    siFalla: 'No se pudo cargar el reporte de gastos sin documento fiscal.',
  });

/** CC-R4: el estado de los fondos al corte. */
export const usarEstadoDeLosFondos = () =>
  usarReporte({
    ...alCorte,
    pedir: (consulta) => api.estadoDeFondos(consulta),
    intercambio: api.intercambioDeEstado,
    siFalla: 'No se pudo cargar el estado de los fondos.',
  });

/** CC-R5: los arqueos del período. */
export const usarArqueosDelPeriodo = () =>
  usarReporte({
    ...delPeriodo,
    pedir: (consulta) => api.arqueos(consulta),
    intercambio: api.intercambioDeArqueos,
    siFalla: 'No se pudo cargar el reporte de arqueos.',
  });
