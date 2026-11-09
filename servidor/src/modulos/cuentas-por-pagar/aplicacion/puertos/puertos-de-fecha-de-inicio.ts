/** Lo que Cuentas por pagar pregunta a sus datos para aceptar una fecha de inicio nueva. */
export interface SaldosInicialesPorFecha {
  /** Cuántos saldos iniciales de la empresa activa tienen emisión igual o posterior a la fecha (`AAAA-MM-DD`). */
  contarEmitidosDesde(fecha: string): Promise<number>;
}
