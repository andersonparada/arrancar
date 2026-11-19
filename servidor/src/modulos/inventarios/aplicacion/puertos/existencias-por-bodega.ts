/** Cuánto cambia la cantidad de un artículo en una bodega y lote. */
export interface CambioDeExistencia {
  bodegaId: string;
  articuloId: string;
  loteId: string | null;
  /** Diezmilésimas de la unidad base, con signo. */
  cantidad: bigint;
}

/**
 * La cantidad actual por bodega, artículo y lote. La actualiza el caso de uso del movimiento en la misma transacción;
 * nunca se calcula por fuera. La RLS deja escribir solo en las bodegas que el usuario ve.
 */
export interface ExistenciasPorBodega {
  mover(cambios: readonly CambioDeExistencia[]): Promise<void>;
}
