import { RepartoInvalido } from './errores.js';
import { proporcion } from './escalas.js';

export interface BaseDeReparto {
  readonly entradaId: string;
  /** Valor, cantidad o peso de la entrada, según la base elegida (o el monto a mano). */
  readonly base: bigint;
}

/** Cuánto va a cada entrada; el último renglón absorbe el redondeo para que la suma sea exacta (§7.5). */
export function repartirMonto(monto: bigint, entradas: readonly BaseDeReparto[]): Map<string, bigint> {
  const total = entradas.reduce((suma, e) => suma + e.base, 0n);
  if (total <= 0n) throw new RepartoInvalido();
  const partes = new Map<string, bigint>();
  let repartido = 0n;
  entradas.forEach((e, i) => {
    const parte = i === entradas.length - 1 ? monto - repartido : proporcion(monto, e.base, total);
    partes.set(e.entradaId, parte);
    repartido += parte;
  });
  return partes;
}

export interface DatosDeAbsorcion {
  /** Parte del monto que le tocó a la entrada (negativa en una rebaja). */
  readonly parte: bigint;
  readonly cantidadDeLaEntrada: bigint;
  /** PEPS: lo que queda de su capa. Promedio: la cantidad del artículo a la fecha del documento. */
  readonly cantidadQueQueda: bigint;
  /** Valor actual de lo que queda (capa o artículo): una rebaja nunca lo deja negativo. */
  readonly valorQueQueda: bigint;
}

export interface Absorcion {
  readonly absorbido: bigint;
  readonly aResultados: bigint;
}

/**
 * Parte que absorbe la existencia (entra como movimiento de valor) y parte que va a resultados (§7.5).
 * La proporción es `min(1, cantidadQueQueda / cantidadDeLaEntrada)`; el exceso de una rebaja también va a resultados.
 */
export function absorber(datos: DatosDeAbsorcion): Absorcion {
  const queda = datos.cantidadQueQueda < datos.cantidadDeLaEntrada ? datos.cantidadQueQueda : datos.cantidadDeLaEntrada;
  let absorbido = queda <= 0n ? 0n : proporcion(datos.parte, queda, datos.cantidadDeLaEntrada);
  if (absorbido < 0n && -absorbido > datos.valorQueQueda) absorbido = -datos.valorQueQueda;
  return { absorbido, aResultados: datos.parte - absorbido };
}
