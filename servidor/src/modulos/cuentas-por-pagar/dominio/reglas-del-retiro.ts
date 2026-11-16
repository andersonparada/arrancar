import {
  RetiroCobrado,
  RetiroConPagos,
  RetiroLiquidado,
  RetiroNoLiquidado,
  RetiroYaAnulado,
} from './errores-de-retiros.js';
import { numeroDelRetiro, type RetiroDeEfectivo } from './retiros.js';

const numeroDe = (retiro: Pick<RetiroDeEfectivo, 'numero' | 'anioDeNumero'>): string =>
  numeroDelRetiro(retiro.numero, retiro.anioDeNumero);

/** @throws RetiroYaAnulado, RetiroLiquidado: solo un retiro abierto se anula o se liquida. */
export function exigirRetiroAbierto(retiro: RetiroDeEfectivo): void {
  if (retiro.estado === 'anulado') throw new RetiroYaAnulado(numeroDe(retiro));
  if (retiro.estado === 'liquidado') throw new RetiroLiquidado(numeroDe(retiro));
}

/** @throws RetiroYaAnulado, RetiroNoLiquidado: solo un retiro liquidado se reabre. */
export function exigirRetiroLiquidado(retiro: RetiroDeEfectivo): void {
  if (retiro.estado === 'anulado') throw new RetiroYaAnulado(numeroDe(retiro));
  if (retiro.estado === 'abierto') throw new RetiroNoLiquidado(numeroDe(retiro));
}

/** Lo que se necesita saber, además del retiro, para decidir si se anula. */
export interface RevisionDeAnulacion {
  /** Los números de los pagos vigentes del retiro. */
  pagosVigentes: readonly string[];
  /** El cheque o la nota del retiro ya está conciliado (el banco lo pagó). */
  conciliado: boolean;
}

/**
 * Un retiro se anula si está abierto, sin pagos vigentes y su cheque no está cobrado.
 * @throws RetiroYaAnulado, RetiroLiquidado, RetiroConPagos, RetiroCobrado
 */
export function exigirRetiroAnulable(
  retiro: RetiroDeEfectivo,
  { pagosVigentes, conciliado }: RevisionDeAnulacion,
): void {
  exigirRetiroAbierto(retiro);
  if (pagosVigentes.length > 0) throw new RetiroConPagos(numeroDe(retiro), pagosVigentes);
  if (conciliado) throw new RetiroCobrado(numeroDe(retiro));
}
