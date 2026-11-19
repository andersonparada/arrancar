import {
  ElPosfechadoSeAnulaComoCheque,
  NoSeAnulaElSaldoDelBanco,
  PagadorObligatorio,
  PartidaDeAperturaNoEncontrada,
} from './errores-de-apertura.js';
import type { ParteDeApertura } from './partes-de-apertura.js';

/** Las partidas de la carga inicial que se anulan con un inverso (docs/modulos/diseno-bancos-segunda-parte.md §5.3). */
export const PARTES_QUE_SE_ANULAN = [
  'cheque_en_circulacion',
  'deposito_en_transito',
  'debito_en_transito',
  'error_del_banco',
] as const;

/** La clave del concepto de sistema con que se clasifica el inverso: no mueve efectivo (actividad ninguna). */
export const CLAVE_DE_ANULACION_DE_APERTURA = 'anulacion_de_apertura';

export type ParteQueSeAnula = (typeof PARTES_QUE_SE_ANULAN)[number];

const MAXIMO_DEL_PAGADOR = 150;

const seAnula = (parte: ParteDeApertura | null): parte is ParteQueSeAnula =>
  (PARTES_QUE_SE_ANULAN as readonly (ParteDeApertura | null)[]).includes(parte);

/**
 * Exige que la parte sea de las que se anulan con inverso.
 * @throws NoSeAnulaElSaldoDelBanco (el saldo del banco o el global se corrigen o se eliminan), ElPosfechadoSeAnulaComoCheque
 *   (no es partida de apertura: se anula en Cheques) o PartidaDeAperturaNoEncontrada si es un movimiento normal.
 */
export function exigirPartidaQueSeAnula(parte: ParteDeApertura | null): ParteQueSeAnula {
  if (parte === 'saldo_del_banco' || parte === 'saldo_global') throw new NoSeAnulaElSaldoDelBanco();
  if (parte === 'cheque_posfechado') throw new ElPosfechadoSeAnulaComoCheque();
  if (!seAnula(parte)) throw new PartidaDeAperturaNoEncontrada();
  return parte;
}

/**
 * Quién debe el dinero de un depósito en tránsito rechazado (C-4): obligatorio, de 1 a 150 caracteres. Las demás partes no
 * lo llevan y lo que se mande se ignora.
 * @returns el pagador sin espacios, o `null` si la parte no lo pide.
 * @throws PagadorObligatorio
 */
export function pagadorDeLaAnulacion(parte: ParteQueSeAnula, pagador: string | null | undefined): string | null {
  if (parte !== 'deposito_en_transito') return null;
  const limpio = pagador?.trim() ?? '';
  if (!limpio || limpio.length > MAXIMO_DEL_PAGADOR) throw new PagadorObligatorio();
  return limpio;
}
