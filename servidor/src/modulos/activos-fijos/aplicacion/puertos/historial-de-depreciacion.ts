import type { LibroDeDepreciacion } from '../../dominio/depreciacion/tramo.js';

/** Lo que un activo lleva depreciado según los cierres vigentes y su saldo inicial. */
export interface HistorialDeDepreciacion {
  /** Lo que las cuotas vigentes ya depreciaron de cada tramo (por id del tramo). */
  depreciadoPorTramo: Map<string, number>;
  /** La acumulada de cada libro: el saldo inicial más la suma de las cuotas vigentes. */
  acumuladaCentavos: Record<LibroDeDepreciacion, number>;
}

/** Lee lo depreciado de un activo. La seguridad por empresa (RLS) limita lo que se ve. */
export interface LectorDeHistorialDeDepreciacion {
  deActivo(activoId: string): Promise<HistorialDeDepreciacion>;
}
