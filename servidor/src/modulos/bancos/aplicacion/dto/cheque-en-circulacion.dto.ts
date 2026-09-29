/** De dónde salió el cheque: de un pago de Cuentas por pagar o emitido suelto desde Bancos. */
export type OrigenDeCheque = 'cuentas_por_pagar' | 'suelto';

/** Un cheque emitido que el banco no ha cobrado y ya pasó el plazo de vencimiento. */
export interface ChequeEnCirculacionDto {
  chequeId: string;
  movimientoId: string;
  cuentaBancariaId: string;
  cuentaBancariaNombre: string;
  serie: string | null;
  numero: number;
  fecha: string;
  diasDeAntiguedad: number;
  beneficiario: string | null;
  monto: string;
  /** Si el mes del cheque ya está conciliado (autorizado): anularlo obliga a crear una nota inversa. */
  mesConciliado: boolean;
  origen: OrigenDeCheque;
}

export interface ReporteDeChequesCaducosDto {
  /** Los meses de antigüedad con que se armó el reporte (el filtro o la variable de la empresa). */
  mesesDeAntiguedad: number;
  /** Los cheques con fecha anterior a esta son los que aparecen. */
  fechaDeCorte: string;
  totalDeCheques: number;
  montoTotal: string;
  /** Del más antiguo al más reciente. */
  cheques: ChequeEnCirculacionDto[];
}

/** Lo que el usuario puede acotar; sin `meses`, manda la variable `bancos.cheques.meses_de_vencimiento`. */
export interface FiltroDeChequesCaducos {
  cuentaBancariaId?: string;
  beneficiario?: string;
  meses?: number;
}
