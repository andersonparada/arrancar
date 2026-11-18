import type { ParteDeApertura } from '../../dominio/partes-de-apertura.js';

/** Una cuenta bancaria de la empresa con lo de su saldo inicial (la cabecera, si la tiene). */
export interface CuentaConSuCabecera {
  cuentaBancariaId: string;
  cuentaNombre: string;
  bancoNombre: string | null;
  activa: boolean;
  /** Nulo si la cuenta no tiene saldo inicial. */
  cabeceraId: string | null;
  saldoSegunLibrosAnteriores: string | null;
  observaciones: string | null;
  tieneEvidencia: boolean;
  tieneConciliaciones: boolean;
}

/** Una partida de la apertura tal como está en la base, con lo que hace falta para armar su ficha. */
export interface PartidaDeLaBase {
  movimientoId: string;
  cuentaBancariaId: string;
  parte: ParteDeApertura;
  tipo: 'credito' | 'debito' | 'cheque';
  fecha: string;
  monto: string;
  serie: string | null;
  numeroDeCheque: number | null;
  beneficiario: string | null;
  referencia: string | null;
  observaciones: string | null;
  conceptoId: string;
  conceptoNombre: string;
  /** La conciliación en la que está marcada; nulo si no. */
  conciliacionId: string | null;
  conciliadaEn: { anio: number; mes: number } | null;
  anulada: boolean;
  revertida: boolean;
}

/** El saldo principal de una cuenta: de qué parte es y su fecha. */
export interface SaldoPrincipal {
  cuentaBancariaId: string;
  parte: 'saldo_del_banco' | 'saldo_global';
  fecha: string;
}

/** Lecturas de los saldos iniciales para las pantallas, el cuadre y las reglas. */
export interface ConsultasDeSaldosIniciales {
  /** Todas las cuentas de la empresa por nombre, con su cabecera si la tienen. */
  cuentas(): Promise<CuentaConSuCabecera[]>;
  /** Las partidas de apertura (todas las partes, el posfechado incluido) de una cuenta o de toda la empresa. */
  partidas(cuentaBancariaId?: string): Promise<PartidaDeLaBase[]>;
  /** Cuántos movimientos normales vigentes (sin parte de apertura) tiene la cuenta con fecha hasta `corte`, incluida. */
  contarMovimientosNormalesHasta(cuentaBancariaId: string, corte: string): Promise<number>;
  /** Los saldos principales vigentes de todas las cuentas (el del banco y el global). */
  saldosPrincipales(): Promise<SaldoPrincipal[]>;
}
