/** Una nota de intereses (H8): lo que dijo el banco y lo que acreditó. */
export interface InteresDelReporteDto {
  movimientoId: string;
  fecha: string;
  cuentaBancariaId: string;
  cuentaBancariaNombre: string;
  /** El número de la nota de crédito (H9); nulo solo si no lo tiene. */
  numero: number | null;
  referencia: string | null;
  interesBruto: string;
  isrRetenido: string;
  /** Lo que acreditó el banco (el monto de la nota): bruto - ISR. */
  neto: string;
}

/** Los totales de una cuenta: para conciliar con la constancia de retención que da cada banco. */
export interface InteresesDeUnaCuentaDto {
  cuentaBancariaId: string;
  cuentaBancariaNombre: string;
  cantidad: number;
  interesBruto: string;
  isrRetenido: string;
  neto: string;
}

export interface ReporteDeInteresesDto {
  desde: string;
  hasta: string;
  cuentaBancariaId: string | null;
  totalDeNotas: number;
  interesBruto: string;
  isrRetenido: string;
  neto: string;
  /** Notas de un concepto de intereses que no tienen el bruto y el ISR (por ejemplo, reclasificadas): faltan en el reporte. */
  notasSinDatos: number;
  porCuenta: InteresesDeUnaCuentaDto[];
  /** De la más antigua a la más reciente. */
  intereses: InteresDelReporteDto[];
}

export interface FiltroDeIntereses {
  desde: string;
  hasta: string;
  cuentaBancariaId?: string;
}
