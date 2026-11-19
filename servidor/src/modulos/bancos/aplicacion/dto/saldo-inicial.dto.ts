import type { AvisoDePartida } from '../../dominio/apertura.js';
import type { HallazgoDeCierre } from '../../dominio/hallazgos-de-cierre.js';
import type { ParteDeApertura, ParteQueSeAgrega } from '../../dominio/partes-de-apertura.js';

/** Un aviso que no bloquea: lo que el servidor quiere que el usuario sepa al guardar. */
export interface AvisoDeApertura {
  codigo: string;
  mensaje: string;
}

/** Cómo está la apertura de una cuenta: sin saldo, con partidas o con el saldo global de antes. */
export type FormaDelSaldoInicial = 'sin_saldo' | 'con_partidas' | 'global';

/** Una partida de la apertura como la ve la pantalla (§6.3 del diseño). */
export interface PartidaDeAperturaDto {
  movimientoId: string;
  parte: ParteDeApertura;
  /** El sentido del movimiento; en el error del banco dice si suma (`credito`) o resta (`debito`). */
  tipo: 'credito' | 'debito' | 'cheque';
  fecha: string;
  monto: string;
  serie: string | null;
  numeroDeCheque: number | null;
  beneficiario: string | null;
  referencia: string | null;
  observaciones: string | null;
  /** Solo el posfechado trae el concepto que eligió el usuario. */
  conceptoId: string | null;
  conceptoNombre: string | null;
  conciliadaEn: { anio: number; mes: number } | null;
  anulada: boolean;
  revertida: boolean;
  avisos: Array<'antiguo' | 'deposito_viejo'>;
  puedeCorregir: boolean;
  puedeEliminar: boolean;
  /** Se anula con un inverso: cheque en circulación, depósito o débito en tránsito y error del banco vigentes, sin marcar en una conciliación (§5.3). */
  puedeAnular: boolean;
}

/** Una cuenta con el cuadre de su saldo inicial (§2.2 y §6.3). Las que no tienen saldo salen con ceros. */
export interface SaldoInicialResumenDto {
  cuentaBancariaId: string;
  cuentaNombre: string;
  bancoNombre: string | null;
  /** Si la cuenta bancaria está activa (la revisión del cierre solo cuenta las activas). */
  activa: boolean;
  forma: FormaDelSaldoInicial;
  fechaDeCorte: string | null;
  saldoSegunEstadoDeCuenta: string | null;
  totalDepositosEnTransito: string;
  totalChequesEnCirculacion: string;
  totalDebitosEnTransito: string;
  /** Con signo: positivo suma al saldo en libros. */
  totalErroresDelBanco: string;
  saldoEnLibrosAlCorte: string;
  saldoSegunLibrosAnteriores: string | null;
  diferencia: string | null;
  cuadra: boolean;
  /** Informativo: los posfechados cuentan en su fecha, no en el cuadre. */
  totalPosfechados: string;
  tieneEvidencia: boolean;
  tieneConciliaciones: boolean;
  puedeEditar: boolean;
  puedeEliminar: boolean;
}

/** La lista de todas las cuentas con sus cuadres y los totales de la empresa, sin compensar (cambio 5). */
export interface SaldosInicialesDto {
  fechaDeInicio: string | null;
  fechaDeCorte: string | null;
  cargaCerrada: boolean;
  cuentas: SaldoInicialResumenDto[];
  /** Σ de las cuentas con saldo en libros al corte positivo. */
  totalBancos: string;
  /** Σ de las negativas, en valor absoluto. */
  totalSobregiros: string;
  hallazgos: HallazgoDeCierre[];
}

/** La ficha de una cuenta: su resumen, sus observaciones y todas sus partidas. */
export interface SaldoInicialDto extends SaldoInicialResumenDto {
  observaciones: string | null;
  partidas: PartidaDeAperturaDto[];
}

/** Lo que se guarda de la cabecera de una cuenta. */
export interface SolicitudDeSaldoInicial {
  cuentaBancariaId: string;
  /** El saldo según el estado de cuenta al corte; con signo (negativo = el banco le cobra a la empresa). */
  saldoSegunEstadoDeCuenta: string;
  saldoSegunLibrosAnteriores: string | null;
  observaciones: string | null;
}

/** Lo que se escribe de una partida; lo que no aplica a su parte se ignora. */
export interface SolicitudDePartida {
  cuentaBancariaId: string;
  parte: ParteQueSeAgrega;
  fecha: string;
  monto: string;
  sentido: 'credito' | 'debito' | null;
  conceptoId: string | null;
  serie: string | null;
  numeroDeCheque: number | null;
  beneficiario: string | null;
  referencia: string | null;
  observaciones: string | null;
}

export interface SaldoInicialGuardadoDto {
  saldoInicial: SaldoInicialDto;
  avisos: AvisoDeApertura[];
}

/** La partida ya anulada (con su marca de revertida) y el inverso que la compensa. */
export interface PartidaAnuladaDto {
  partida: PartidaDeAperturaDto;
  inversoId: string;
}

export interface PartidaGuardadaDto {
  partida: PartidaDeAperturaDto;
  avisos: AvisoDeApertura[];
}

export type { AvisoDePartida, HallazgoDeCierre };
