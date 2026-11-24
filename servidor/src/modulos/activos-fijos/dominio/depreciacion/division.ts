import { abrirTramoContable } from './libro-contable.js';
import { abrirTramoFiscal } from './libro-fiscal.js';
import type { TramoCalculado } from './tramo.js';

/** Las cifras de un activo (o de una de sus partes) que la división reparte, todas en centavos (§7.6). */
export interface CifrasDeDivision {
  /** Σ de los costos vigentes que aplican al libro fiscal. */
  costoQueAplicaCentavos: number;
  /** Σ de los costos vigentes que no aplican (desmantelamiento y otros). */
  costoQueNoAplicaCentavos: number;
  /** Depreciación acumulada contable y fiscal al cierre del mes anterior a la división. */
  acumuladaContableCentavos: number;
  acumuladaFiscalCentavos: number;
  valorResidualCentavos: number;
  /** La base fiscal `B` del activo (costos que aplican, con el tope y el saldo inicial). */
  baseFiscalCentavos: number;
  /** Sobre qué se aplica el porcentaje en el tramo fiscal vigente; `null` si no hay tramo fiscal. */
  baseDelPorcentajeCentavos: number | null;
}

/** El activo repartido: lo que se lleva el nuevo y lo que queda en el origen (el sobrante del redondeo). */
export interface CifrasRepartidas {
  nuevo: CifrasDeDivision;
  origen: CifrasDeDivision;
}

/** La cantidad del activo y la que se separa: `1 <= separadas < original`. */
export interface CantidadesDeDivision {
  separadas: number;
  original: number;
}

/** `round(q × k / n)` con la mitad hacia arriba; un monto negativo se redondea por su valor absoluto. */
export function proporcion(centavos: number, { separadas, original }: CantidadesDeDivision): number {
  const absoluto = BigInt(Math.abs(centavos));
  const parte = Number((2n * absoluto * BigInt(separadas) + BigInt(original)) / (2n * BigInt(original)));
  return centavos < 0 ? -parte : parte;
}

type CampoReparto = Exclude<keyof CifrasDeDivision, 'baseDelPorcentajeCentavos'>;

const CAMPOS: readonly CampoReparto[] = [
  'costoQueAplicaCentavos',
  'costoQueNoAplicaCentavos',
  'acumuladaContableCentavos',
  'acumuladaFiscalCentavos',
  'valorResidualCentavos',
  'baseFiscalCentavos',
];

/**
 * Reparte cada cifra del activo entre el activo nuevo (`k` unidades) y el origen (las otras `n − k`): el nuevo recibe
 * `round(Q × k / n)` y el origen, el sobrante, así lo repartido siempre suma lo que había.
 * @throws RangeError si no se cumple `1 <= k < n` con enteros.
 */
export function repartirCifras(cifras: CifrasDeDivision, cantidades: CantidadesDeDivision): CifrasRepartidas {
  const { separadas, original } = cantidades;
  if (!Number.isInteger(separadas) || !Number.isInteger(original) || separadas < 1 || separadas >= original)
    throw new RangeError('La cantidad separada debe cumplir 1 <= k < n.');
  const nuevo = { ...cifras };
  const origen = { ...cifras };
  for (const campo of CAMPOS) {
    nuevo[campo] = proporcion(cifras[campo], cantidades);
    origen[campo] = cifras[campo] - nuevo[campo];
  }
  const base = cifras.baseDelPorcentajeCentavos;
  if (base !== null) {
    nuevo.baseDelPorcentajeCentavos = proporcion(base, cantidades);
    origen.baseDelPorcentajeCentavos = base - nuevo.baseDelPorcentajeCentavos;
  }
  return { nuevo, origen };
}

export interface EntradaDeTramosDeUnaParte {
  /** El primer mes que usan los tramos de la división: nunca antes del tramo vigente del activo. */
  desdePeriodo: string;
  cifras: CifrasDeDivision;
  porcentajeFiscal: string;
  /** Los meses contables que le faltaban al tramo del origen; `null` si ya no le falta ninguno. */
  mesesQueFaltan: number | null;
}

/** Los tramos que recibe un activo en la división; el contable falta si el libro ya agotó su vida. */
export interface TramosDeUnaParte {
  contable: TramoCalculado | null;
  fiscal: TramoCalculado;
}

/**
 * Los tramos de una parte del activo (§7.6): el contable con los meses que le faltaban al tramo del origen, sobre su
 * parte del costo, la acumulada y el residual; el fiscal con la misma tasa sobre su parte de la base.
 */
export function tramosDeUnaParte(entrada: EntradaDeTramosDeUnaParte): TramosDeUnaParte {
  const { desdePeriodo, cifras, porcentajeFiscal, mesesQueFaltan } = entrada;
  const contable =
    mesesQueFaltan === null
      ? null
      : abrirTramoContable({
          desdePeriodo,
          causa: 'division',
          costoCentavos: cifras.costoQueAplicaCentavos + cifras.costoQueNoAplicaCentavos,
          acumuladaCentavos: cifras.acumuladaContableCentavos,
          valorResidualCentavos: cifras.valorResidualCentavos,
          meses: mesesQueFaltan,
        });
  const fiscal = abrirTramoFiscal({
    desdePeriodo,
    causa: 'division',
    baseFiscalCentavos: cifras.baseFiscalCentavos,
    acumuladaCentavos: cifras.acumuladaFiscalCentavos,
    porcentaje: porcentajeFiscal,
    baseDelPorcentajeCentavos: cifras.baseDelPorcentajeCentavos ?? cifras.baseFiscalCentavos,
  });
  return { contable, fiscal };
}
