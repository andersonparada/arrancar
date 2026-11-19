/** Si el kardex ya usa un artículo o una bodega: de eso dependen qué datos se pueden cambiar o inactivar. */
export interface ConsultasDeUsoDelKardex {
  /**
   * Si el artículo tiene movimientos (vigentes o anulados). Toma el candado del artículo del kardex hasta el fin de la
   * transacción, para que un movimiento en camino no se cuele después de la revisión.
   */
  articuloConMovimientos(articuloId: string): Promise<boolean>;
  /** Si el artículo tiene cantidad mayor que cero en alguna bodega (lee el saldo de toda la empresa). */
  articuloConExistencias(articuloId: string): Promise<boolean>;
  /** Si la bodega tiene cantidad mayor que cero de algún artículo. */
  bodegaConExistencias(bodegaId: string): Promise<boolean>;
}
