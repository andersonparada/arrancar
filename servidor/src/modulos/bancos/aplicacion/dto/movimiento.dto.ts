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
  /** La conciliación donde quedó marcado; si no, `null`. */
  conciliacionId: string | null;
  /** Cuándo se revirtió (se le creó un inverso); `null` si nunca se revirtió. */
  revertidoEn: string | null;
  motivoDeReversion: string | null;
  /** El movimiento original que revierte, si este es un inverso; si no, `null`. */
  revierteAId: string | null;
  /** Número correlativo de su tipo (nota de crédito o de débito, inversos incluidos); `null` en cheques, saldo inicial y notas de transferencia. */
  numero: number | null;
  /** Año del correlativo si la empresa lo reinicia cada año; 0 si no (lo normal). */
  anioDeNumero: number;
  /** Lo calcula el servidor (ver `accionesDeMovimiento`): si se puede anular con un movimiento inverso. */
  puedeAnular: boolean;
  /** Lo calcula el servidor: si se puede eliminar de verdad (está limpio). */
  puedeEliminar: boolean;
}

/** Lo que se recibe para registrar o corregir un movimiento, ya validado en su forma. La API nunca acepta `tipo: 'cheque'`. */
export type SolicitudDeMovimiento = Omit<
  MovimientoDto,
  | 'id'
  | 'anuladoEn'
  | 'motivoDeAnulacion'
  | 'cuentaBancariaNombre'
  | 'transferenciaId'
  | 'chequeId'
  | 'numeroDeCheque'
  | 'conciliacionId'
  | 'revertidoEn'
  | 'motivoDeReversion'
  | 'revierteAId'
  | 'numero'
  | 'anioDeNumero'
  | 'puedeAnular'
  | 'puedeEliminar'
> & { tipo: 'credito' | 'debito' };

/** Qué movimientos listar: de una cuenta y entre dos fechas (incluidas); lo que falte no filtra.
 * `clase` acota a solo notas (crédito o débito sueltas) o solo saldos iniciales; sin ella, todo (para el reporte). */
export interface FiltroDeMovimientos {
  cuentaBancariaId?: string;
  desde?: string;
  hasta?: string;
  clase?: 'notas' | 'saldosIniciales';
}
