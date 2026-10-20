import type { TipoDeLibro } from '../../dominio/libro/tipo-de-libro.js';

/** Una emisión del libro con folios, tal como quedó guardada; nunca se corrige. */
export interface EmisionDelLibro {
  id: string;
  periodo: string;
  tipoDeLibro: TipoDeLibro;
  folioDesde: number;
  folioHasta: number;
  paginas: number;
  archivoId: string | null;
  huellaDeDatos: string;
  versionDePlantilla: number;
  totales: unknown;
  motivo: string | null;
  creadoEn: Date;
}

export type EmisionNueva = Omit<EmisionDelLibro, 'id' | 'creadoEn'>;

/** El historial de emisiones: solo se agrega y se lee. Corre en la transacción de la empresa activa. */
export interface RepositorioDeEmisiones {
  agregar(empresaId: string, emision: EmisionNueva): Promise<EmisionDelLibro>;
  buscar(id: string): Promise<EmisionDelLibro | null>;
  /** Las emisiones, de la más nueva a la más vieja; de un período o de todos. */
  listar(periodo: string | null): Promise<EmisionDelLibro[]>;
  /** Una emisión del período con esos mismos datos y esa versión de plantilla. */
  buscarIgual(periodo: string, huella: string, version: number): Promise<EmisionDelLibro | null>;
  hayDelPeriodo(periodo: string): Promise<boolean>;
  /** El mayor folio que Arrancar ha emitido; 0 si no ha emitido ninguno. */
  mayorFolioEmitido(): Promise<number>;
}

/** El último folio usado de la empresa. */
export interface RepositorioDeFoliacion {
  /** El último folio usado, sin bloquear; 0 si la empresa aún no ha emitido. */
  ultimoFolio(): Promise<number>;
  /** Crea la fila si no existe y la bloquea hasta el fin de la transacción: las emisiones se ordenan. */
  bloquear(empresaId: string): Promise<number>;
  fijarUltimoFolio(empresaId: string, ultimoFolio: number): Promise<void>;
}
