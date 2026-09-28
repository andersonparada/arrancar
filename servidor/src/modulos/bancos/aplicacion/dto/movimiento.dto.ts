/** Movimiento tal como lo ve el usuario en pantalla. */
export interface MovimientoDto {
  id: string;
  cuentaBancariaId: string;
  tipo: 'credito' | 'debito' | 'cheque';
  fecha: string;
  monto: string;
  saldoInicial: boolean;
  referencia: string | null;
  beneficiario: string | null;
  observaciones: string | null;
  anuladoEn: string | null;
  motivoDeAnulacion: string | null;
  cuentaBancariaNombre: string | null;
  /** La transferencia que lo creó, si es una de sus dos notas; si no, `null`. */
  transferenciaId: string | null;
  /** El cheque que lo creó, si es tipo `cheque`; si no, `null`. */
  chequeId: string | null;
  /** El número del cheque que lo creó; si no, `null`. */
  numeroDeCheque: number | null;
}

/** Lo que se recibe para registrar o corregir un movimiento, ya validado en su forma. La API nunca acepta `tipo: 'cheque'`. */
export type SolicitudDeMovimiento = Omit<
  MovimientoDto,
  'id' | 'anuladoEn' | 'motivoDeAnulacion' | 'cuentaBancariaNombre' | 'transferenciaId' | 'chequeId' | 'numeroDeCheque'
> & { tipo: 'credito' | 'debito' };

/** Qué movimientos listar: de una cuenta y entre dos fechas (incluidas); lo que falte no filtra. */
export interface FiltroDeMovimientos {
  cuentaBancariaId?: string;
  desde?: string;
  hasta?: string;
}
