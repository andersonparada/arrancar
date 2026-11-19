import { costoUnitarioDe } from './escalas.js';
import { compararEnKardex } from './orden.js';
import type { PosicionEnKardex } from './tipos.js';

export type OrigenDeEntrada =
  | 'recepcion'
  | 'saldo_inicial'
  | 'entrada_manual'
  | 'donacion'
  | 'produccion'
  | 'traslado'
  | 'sobrante'
  | 'error_de_registro';

export interface EntradaParaSobrante {
  readonly fecha: string;
  readonly secuencia: number;
  readonly origen: OrigenDeEntrada;
  /** Diezmilésimas. */
  readonly cantidad: bigint;
  /** Centavos de la entrada, sin repartos. */
  readonly costoTotal: bigint;
  /** Suma con signo de los montos de sus repartos vigentes (costos adicionales y rebajas). */
  readonly repartos: bigint;
}

const ORIGENES_CON_COSTO_REAL: readonly OrigenDeEntrada[] = ['recepcion', 'saldo_inicial', 'produccion'];
const ORIGENES_CON_COSTO_SI_ES_MAYOR_A_CERO: readonly OrigenDeEntrada[] = ['entrada_manual', 'donacion'];

/**
 * Tiene «costo real» (V-5): recepción, saldo inicial, producción, o entrada manual o donación con costo mayor
 * que cero. No lo tienen las mitades de traslado, los sobrantes ni las entradas por error de registro.
 */
export function tieneCostoReal(e: Pick<EntradaParaSobrante, 'origen' | 'costoTotal'>): boolean {
  if (ORIGENES_CON_COSTO_REAL.includes(e.origen)) return true;
  return ORIGENES_CON_COSTO_SI_ES_MAYOR_A_CERO.includes(e.origen) && e.costoTotal > 0n;
}

/**
 * Costo unitario (millonésimas) ajustado de la última entrada con costo real antes de `antesDe`:
 * `(costo + repartos) ÷ cantidad`, que incluye costos adicionales y rebajas. `undefined` si no hay ninguna.
 */
export function costoAjustadoDeLaUltimaEntrada(
  entradas: readonly EntradaParaSobrante[],
  antesDe: PosicionEnKardex,
): bigint | undefined {
  const ultima = entradas
    .filter((e) => tieneCostoReal(e) && e.cantidad > 0n)
    .filter((e) => compararEnKardex({ ...e, tipo: 'entrada' }, antesDe) < 0)
    .sort((a, b) => compararEnKardex({ ...a, tipo: 'entrada' }, { ...b, tipo: 'entrada' }))
    .at(-1);
  return ultima ? costoUnitarioDe(ultima.costoTotal + ultima.repartos, ultima.cantidad) : undefined;
}
