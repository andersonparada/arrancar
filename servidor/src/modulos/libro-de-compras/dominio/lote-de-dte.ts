/** Para qué se subió el archivo: cargar la bandeja o solo conciliar (la conciliación liviana no crea filas). */
export type PropositoDeLote = 'bandeja' | 'conciliacion';

/** El formato del archivo, detectado por su contenido y no por su nombre. */
export type FormatoDeArchivoDte = 'xlsx' | 'csv';

/** Una fila que no entró a la bandeja, con el motivo. */
export interface RechazoDeLote {
  fila: number;
  autorizacion: string | null;
  motivo: string;
  detalle: string;
}

/** Máximo de rechazos que se guardan en el lote (el resumen dice cuántos hubo en total). */
export const MAXIMO_DE_RECHAZOS_GUARDADOS = 1000;

/** El resumen de una carga: lo que se guarda de cada archivo subido (nunca el archivo). */
export interface LoteDeDte {
  id: string;
  empresaId: string;
  proposito: PropositoDeLote;
  formato: FormatoDeArchivoDte;
  nombreDelArchivo: string;
  sha256: string;
  tamanoEnBytes: number;
  versionDelMapa: string;
  emisionDesde: string | null;
  emisionHasta: string | null;
  filasLeidas: number;
  filasNuevas: number;
  filasActualizadas: number;
  filasSinCambio: number;
  filasRechazadas: number;
  anuladasEnLaSat: number;
  rechazos: RechazoDeLote[];
  encabezadosNoReconocidos: string[];
  resumenDeConciliacion: Record<string, number> | null;
}
