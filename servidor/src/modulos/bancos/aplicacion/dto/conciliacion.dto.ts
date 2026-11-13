import type { Cuadratica, Partida, PartidasDeConciliacion } from '../calculo-de-conciliacion.js';
import type { MovimientoDto } from './movimiento.dto.js';

export type { Cuadratica, Partida, PartidasDeConciliacion };

export type EstadoDeConciliacionDto = 'en_proceso' | 'elaborada' | 'autorizada';

/** Una conciliación en la lista de una cuenta. */
export interface ConciliacionResumenDto {
  id: string;
  anio: number;
  mes: number;
  estado: EstadoDeConciliacionDto;
  elaboradaEn: string | null;
  autorizadaEn: string | null;
}

/** Un movimiento candidato de la pantalla de conciliar, con si está marcado. */
export interface MovimientoConMarcaDto extends Omit<
  MovimientoDto,
  'puedeAnular' | 'puedeEliminar' | 'puedeReclasificar' | 'conceptoNombre'
> {
  marcado: boolean;
}

/** El documento de conciliación completo: encabezado, cuadro cuadrático, partidas y candidatos. */
export interface ConciliacionDto {
  id: string;
  cuentaBancariaId: string;
  cuentaBancariaNombre: string | null;
  bancoNombre: string | null;
  numeroDeCuenta: string | null;
  empresaNombre: string | null;
  anio: number;
  mes: number;
  estado: EstadoDeConciliacionDto;
  elaboradaPorNombre: string | null;
  elaboradaEn: string | null;
  autorizadaPorNombre: string | null;
  autorizadaEn: string | null;
  /** Los movimientos que se pueden marcar (o desmarcar) en esta conciliación. */
  candidatos: MovimientoConMarcaDto[];
  cuadratica: { libros: Cuadratica; banco: Cuadratica };
  partidas: PartidasDeConciliacion;
  saldoQueDebeMostrarElEstadoDeCuenta: string;
  /** El saldo final del estado de cuenta del banco, transcrito por quien elabora; `null` si falta. */
  saldoEstadoDeCuenta: string | null;
  /** Calculado menos transcrito; `null` sin saldo. En las autorizadas, contra la foto. */
  diferenciaConElEstadoDeCuenta: string | null;
  /** Elaborada o autorizada antes de que se pidiera el saldo: no tiene saldo transcrito. */
  previaAlSaldoTranscrito: boolean;
}

/** Lo que se recibe para iniciar una conciliación: ya no se escribe ningún saldo. */
export interface SolicitudDeInicioDeConciliacion {
  cuentaBancariaId: string;
  anio: number;
  mes: number;
}
