/** Una línea del reparto por concepto tal como se guarda: el concepto y su parte del monto (dos decimales). */
export interface LineaDeDesgloseGuardada {
  conceptoId: string;
  monto: string;
}

/** Guarda el reparto por concepto de un movimiento (`bancos.desglose_de_movimientos`). */
export interface RepositorioDeDesglose {
  /** Reemplaza todas las líneas del movimiento por estas; sin líneas, las quita. */
  reemplazar(empresaId: string, movimientoId: string, lineas: LineaDeDesgloseGuardada[]): Promise<void>;
}
