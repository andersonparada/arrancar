import type { FormatoDeArchivo } from '../../../../core/intercambio/aplicacion/puertos/lector-de-filas.js';
import { MAXIMO_DE_RECHAZOS_GUARDADOS, type LoteDeDte } from '../../../dominio/lote-de-dte.js';
import { VERSION_DEL_MAPA } from '../../dte/mapa-de-encabezados-sat.js';
import type { ResultadoDeLaLectura } from '../../dte/lector-de-dte-sat.js';
import type { PlanDeCarga } from './clasificador-de-carga.js';

/** De dónde salió el archivo: lo único que el lote guarda de él (nunca el archivo). */
export interface OrigenDelArchivo {
  loteId: string;
  empresaId: string;
  formato: FormatoDeArchivo;
  nombreDelArchivo: string;
  sha256: string;
  tamanoEnBytes: number;
  encabezadosNoReconocidos: readonly string[];
}

const MAXIMO_DEL_NOMBRE = 200;

/** La fecha de emisión menor y mayor de las filas válidas; los dos o ninguno. */
function rangoDeEmision(lectura: ResultadoDeLaLectura): Pick<LoteDeDte, 'emisionDesde' | 'emisionHasta'> {
  const fechas = lectura.filas.map(({ datos }) => datos.fechaEmision).sort();
  return { emisionDesde: fechas[0] ?? null, emisionHasta: fechas.at(-1) ?? null };
}

/**
 * El resumen del lote: cuántas filas entraron, cambiaron, quedaron igual o se rechazaron (las filas idénticas a otra del
 * mismo archivo cuentan como sin cambio), con los primeros 1,000 rechazos.
 */
export function resumenDelLote(origen: OrigenDelArchivo, lectura: ResultadoDeLaLectura, plan: PlanDeCarga): LoteDeDte {
  const sinCambio = plan.sinCambio.length + lectura.repetidasIguales;
  const { loteId, empresaId, formato, sha256, tamanoEnBytes } = origen;
  return {
    id: loteId,
    empresaId,
    proposito: 'bandeja',
    formato,
    nombreDelArchivo: origen.nombreDelArchivo.trim().slice(0, MAXIMO_DEL_NOMBRE) || 'archivo',
    sha256,
    tamanoEnBytes,
    versionDelMapa: VERSION_DEL_MAPA,
    ...rangoDeEmision(lectura),
    filasLeidas: plan.nuevas.length + plan.actualizadas.length + sinCambio + lectura.rechazos.length,
    filasNuevas: plan.nuevas.length,
    filasActualizadas: plan.actualizadas.length,
    filasSinCambio: sinCambio,
    filasRechazadas: lectura.rechazos.length,
    anuladasEnLaSat: plan.anuladasEnLaSat,
    rechazos: lectura.rechazos.slice(0, MAXIMO_DE_RECHAZOS_GUARDADOS),
    encabezadosNoReconocidos: [...origen.encabezadosNoReconocidos],
    resumenDeConciliacion: null,
  };
}
