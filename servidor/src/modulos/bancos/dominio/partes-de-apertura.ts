/** Las siete partes en que se descompone el saldo inicial de una cuenta (docs/modulos/diseno-bancos-segunda-parte.md §2). */
export const PARTES_DE_APERTURA = [
  'saldo_del_banco',
  'cheque_en_circulacion',
  'deposito_en_transito',
  'debito_en_transito',
  'error_del_banco',
  'saldo_global',
  'cheque_posfechado',
] as const;

export type ParteDeApertura = (typeof PARTES_DE_APERTURA)[number];

/** Las que el usuario agrega una por una: el saldo del banco va en la cabecera y el global es de antes (heredado). */
export const PARTES_QUE_SE_AGREGAN = [
  'cheque_en_circulacion',
  'deposito_en_transito',
  'debito_en_transito',
  'error_del_banco',
  'cheque_posfechado',
] as const;

export type ParteQueSeAgrega = (typeof PARTES_QUE_SE_AGREGAN)[number];

/** El saldo «principal» de la cuenta: el del banco al corte (con partidas) o el global de antes. */
export const esSaldoPrincipal = (parte: ParteDeApertura | null): boolean =>
  parte === 'saldo_del_banco' || parte === 'saldo_global';

/** Las partes que son un cheque y viven en la chequera de apertura. */
export const esParteDeCheque = (parte: ParteDeApertura | null): boolean =>
  parte === 'cheque_en_circulacion' || parte === 'cheque_posfechado';

/** El posfechado cuenta en su fecha como cualquier cheque: no es saldo inicial ni partida de apertura. */
export const esSaldoInicialLaParte = (parte: ParteDeApertura): boolean => parte !== 'cheque_posfechado';
