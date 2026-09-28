import type { MovimientoDto } from './movimiento.dto.js';

/** Una conciliación en la lista de una cuenta. */
export interface ConciliacionResumenDto {
  id: string;
  anio: number;
  mes: number;
  saldoSegunBanco: string;
  cerrada: boolean;
}

/** Un movimiento candidato de la pantalla de conciliar, con si está marcado. */
export interface MovimientoConMarcaDto extends MovimientoDto {
  marcado: boolean;
}

/** La conciliación tal como la ve la pantalla de conciliar, con el cálculo en vivo ya resuelto. */
export interface ConciliacionDto {
  id: string;
  cuentaBancariaId: string;
  cuentaBancariaNombre: string | null;
  anio: number;
  mes: number;
  saldoSegunBanco: string;
  /** Saldo según banco de la conciliación anterior; `"0.00"` si es la primera. */
  saldoAnterior: string;
  movimientos: MovimientoConMarcaDto[];
  saldoConciliado: string;
  diferencia: string;
  cerrada: boolean;
}

/** Lo que se recibe para iniciar una conciliación. */
export interface SolicitudDeInicioDeConciliacion {
  cuentaBancariaId: string;
  anio: number;
  mes: number;
  saldoSegunBanco: string;
}
