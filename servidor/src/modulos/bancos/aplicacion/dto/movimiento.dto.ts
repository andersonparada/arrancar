/** Movimiento tal como lo ve el usuario en pantalla. */
export interface MovimientoDto {
  id: string;
  cuentaBancariaId: string;
  tipo: 'credito' | 'debito';
  fecha: string;
  monto: string;
  saldoInicial: boolean;
  referencia: string | null;
  beneficiario: string | null;
  observaciones: string | null;
  anuladoEn: string | null;
  motivoDeAnulacion: string | null;
  cuentaBancariaNombre: string | null;
}

/** Lo que se recibe para registrar o corregir un movimiento, ya validado en su forma. */
export type SolicitudDeMovimiento = Omit<
  MovimientoDto,
  'id' | 'anuladoEn' | 'motivoDeAnulacion' | 'cuentaBancariaNombre'
>;

/** Qué movimientos listar: de una cuenta y entre dos fechas (incluidas); lo que falte no filtra. */
export interface FiltroDeMovimientos {
  cuentaBancariaId?: string;
  desde?: string;
  hasta?: string;
}
