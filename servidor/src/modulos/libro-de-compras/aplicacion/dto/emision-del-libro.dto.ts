import type { EmisionDelLibro } from '../puertos/emisiones-del-libro.js';

export interface EmisionDelLibroDto {
  id: string;
  periodo: string;
  tipoDeLibro: 'completo' | 'simplificado';
  folioDesde: number;
  folioHasta: number;
  paginas: number;
  huellaDeDatos: string;
  versionDePlantilla: number;
  /** El resumen mensual de lo que se imprimió, con montos en texto. */
  totales: unknown;
  motivo: string | null;
  creadoEn: string;
  /** Hay otra emisión posterior del mismo período. */
  sustituida: boolean;
}

export interface EmisionesDelLibroDto {
  ultimoFolio: number;
  emisiones: EmisionDelLibroDto[];
}

export const dtoDeEmision = (emision: EmisionDelLibro, sustituida: boolean): EmisionDelLibroDto => ({
  id: emision.id,
  periodo: emision.periodo,
  tipoDeLibro: emision.tipoDeLibro,
  folioDesde: emision.folioDesde,
  folioHasta: emision.folioHasta,
  paginas: emision.paginas,
  huellaDeDatos: emision.huellaDeDatos,
  versionDePlantilla: emision.versionDePlantilla,
  totales: emision.totales,
  motivo: emision.motivo,
  creadoEn: emision.creadoEn.toISOString(),
  sustituida,
});
