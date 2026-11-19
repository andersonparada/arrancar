import type { ConciliacionDto, ConciliacionResumenDto, EstadoDeCuentaDto } from '../dto/conciliacion.dto.js';

/** El saldo del estado de cuenta al corte de la carga inicial (con su signo) y la fecha del corte. */
export interface SaldoDelBancoDeLaApertura {
  fecha: string;
  monto: string;
}

/** De dónde parte una conciliación: los saldos iniciales de los dos lados y desde qué fecha cuentan los movimientos. */
export interface PuntoDePartida {
  librosEnCentavos: number;
  bancoEnCentavos: number;
  /** Los movimientos del mes de libros son los posteriores a esta fecha (el corte o el fin del mes anterior). */
  despuesDe: string;
  /** Solo si el saldo inicial del banco es el de la carga inicial (la primera conciliación de la cuenta). */
  saldoInicialDelBancoDeLaApertura: SaldoDelBancoDeLaApertura | null;
}

/** Lecturas para las pantallas de conciliación; el cálculo del documento ya viene resuelto. */
export interface ConsultasConciliaciones {
  /** De la más reciente a la más antigua. */
  listar(cuentaBancariaId: string): Promise<ConciliacionResumenDto[]>;
  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  obtener(conciliacionId: string): Promise<ConciliacionDto>;
  /** Los datos del archivo del estado de cuenta, o `null` si no tiene; para la auditoría. */
  estadoDeCuentaDe(conciliacionId: string): Promise<EstadoDeCuentaDto | null>;
  /**
   * Los movimientos que se pueden marcar en esta conciliación: vigentes, de la
   * cuenta, con fecha hasta `finDelMes` (o cheques de fecha posterior, que el banco puede pagar antes) y sin otra
   * conciliación (incluye los ya marcados en esta). Nunca el saldo del banco de la carga inicial.
   */
  idsDeCandidatos(cuentaBancariaId: string, finDelMes: string, conciliacionId: string): Promise<string[]>;
  /** Si la cuenta ya tiene alguna conciliación (de cualquier estado). */
  tieneAlguna(cuentaBancariaId: string): Promise<boolean>;
  /**
   * Ids de los pares original + inverso que nunca pasaron por el banco (ninguno de los dos marcado
   * en otra conciliación; en `conciliacionId` no cuenta, es la que se está haciendo) y tienen fecha
   * hasta `finDelMes`: se marcan juntos, compensados, sin aparecer como partidas en tránsito.
   */
  paresCompensadosPendientes(cuentaBancariaId: string, finDelMes: string, conciliacionId: string): Promise<string[]>;
  /** Si la cuenta se cargó con el saldo del estado de cuenta (también con saldo en cero, que solo tiene cabecera). */
  conSaldoDelBanco(cuentaBancariaId: string): Promise<boolean>;
  /** La fecha del primer movimiento vigente de la cuenta; `null` si no tiene. */
  fechaDelPrimerMovimiento(cuentaBancariaId: string): Promise<string | null>;
}
