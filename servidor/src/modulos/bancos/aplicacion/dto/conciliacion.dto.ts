import type { Cuadratica, Partida, PartidasDeConciliacion } from '../calculo-de-conciliacion.js';
import type { MovimientoDto } from './movimiento.dto.js';

export type { Cuadratica, Partida, PartidasDeConciliacion };

export type EstadoDeConciliacionDto = 'en_proceso' | 'elaborada' | 'autorizada';

/** Las conciliaciones de una cuenta y el periodo que toca conciliar. */
export interface ListaDeConciliacionesDto {
  conciliaciones: ConciliacionResumenDto[];
  /** El mes siguiente a la última; sin ninguna, el de la fecha de inicio o el del primer movimiento; `null` si no hay nada. */
  periodoSiguiente: { anio: number; mes: number } | null;
}

/** Una conciliación en la lista de una cuenta. */
export interface ConciliacionResumenDto {
  id: string;
  anio: number;
  mes: number;
  estado: EstadoDeConciliacionDto;
  elaboradaEn: string | null;
  autorizadaEn: string | null;
  /** Si ya tiene el archivo del estado de cuenta (para el ícono de la lista). */
  tieneEstadoDeCuenta: boolean;
}

/** El archivo del estado de cuenta, sin la ruta en disco ni su id: solo se abre por la ruta de la conciliación. */
export interface EstadoDeCuentaDto {
  tipoMime: string;
  tamanoBytes: number;
  /** Solo los PDF cuentan páginas. */
  paginas: number | null;
  sha256: string;
  /** Como lo llamó quien lo subió (solo para mostrar). */
  nombreOriginal: string | null;
  subidoEn: string;
  subidoPorNombre: string | null;
}

/** Un movimiento candidato de la pantalla de conciliar, con si está marcado. */
export interface MovimientoConMarcaDto extends Omit<
  MovimientoDto,
  | 'puedeAnular'
  | 'puedeEliminar'
  | 'puedeReclasificar'
  | 'conceptoNombre'
  | 'marcadaParaModulo'
  | 'desglose'
  | 'puedeMarcar'
  | 'puedeDesmarcar'
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
  /** Los movimientos que se pueden marcar (o desmarcar) en esta conciliación, con fecha hasta el fin del mes. */
  candidatos: MovimientoConMarcaDto[];
  /** Los cheques con fecha posterior al fin del mes, marcados o no: el banco puede pagarlos antes. */
  posfechadosCandidatos: MovimientoConMarcaDto[];
  /** El saldo inicial del banco de la carga inicial, solo en la primera conciliación de la cuenta con saldo del banco. */
  saldoInicialDelBancoDeLaApertura: { fecha: string; monto: string } | null;
  cuadratica: { libros: Cuadratica; banco: Cuadratica };
  partidas: PartidasDeConciliacion;
  saldoQueDebeMostrarElEstadoDeCuenta: string;
  /** El saldo final del estado de cuenta del banco, transcrito por quien elabora; `null` si falta. */
  saldoEstadoDeCuenta: string | null;
  /** Calculado menos transcrito; `null` sin saldo. En las autorizadas, contra la foto. */
  diferenciaConElEstadoDeCuenta: string | null;
  /** Elaborada o autorizada antes de que se pidiera el saldo: no tiene saldo transcrito. */
  previaAlSaldoTranscrito: boolean;
  /** El archivo del estado de cuenta (PDF o foto), o `null` si no se ha adjuntado. */
  estadoDeCuenta: EstadoDeCuentaDto | null;
}

/** Lo que se recibe para iniciar una conciliación: ya no se escribe ningún saldo. */
export interface SolicitudDeInicioDeConciliacion {
  cuentaBancariaId: string;
  anio: number;
  mes: number;
}
