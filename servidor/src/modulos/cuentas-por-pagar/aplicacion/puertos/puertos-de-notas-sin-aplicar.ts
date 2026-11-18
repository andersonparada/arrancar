/** Lo que filtra R11: el corte y, si se quiere, una cuenta bancaria. */
export interface FiltroDeNotasSinAplicar {
  empresaId: string;
  /** `AAAA-MM-DD`. */
  corte: string;
  cuentaBancariaId?: string;
}

/** Una nota de débito marcada para Cuentas por pagar a la que, al corte, todavía le queda algo por aplicar. */
export interface NotaSinAplicar {
  movimientoId: string;
  cuentaBancariaId: string;
  cuenta: string;
  fecha: string;
  numero: number | null;
  referencia: string | null;
  montoCentavos: number;
  /** Lo que los pagos `nota_ligada` vigentes al corte, con fecha hasta el corte, le aplicaron. */
  aplicadoCentavos: number;
  /** Bancos ya la concilió. */
  conciliada: boolean;
}

/** La lectura de R11, que también usa la conciliación al pie de R1. */
export interface ConsultasDeNotasSinAplicar {
  /** Las notas con disponible al corte, de la más antigua a la más nueva. */
  notasSinAplicar(filtro: FiltroDeNotasSinAplicar): Promise<NotaSinAplicar[]>;
}
