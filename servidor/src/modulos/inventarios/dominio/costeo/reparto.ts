import { RepartoInvalido } from './errores.js';
import { proporcion } from './escalas.js';

export interface BaseDeReparto {
  readonly entradaId: string;
  /** Valor, cantidad o peso de la entrada, según la base elegida (o el monto a mano). */
  readonly base: bigint;
}

/**
 * Cuánto va a cada entrada (§7.5). Redondeo acumulado: cada parte es lo que corresponde a la base acumulada
 * menos lo ya repartido, así el error nunca pasa de un centavo por renglón y la suma es exacta.
 */
export function repartirMonto(monto: bigint, entradas: readonly BaseDeReparto[]): Map<string, bigint> {
  const total = entradas.reduce((suma, e) => suma + e.base, 0n);
  if (total <= 0n) throw new RepartoInvalido();
  const partes = new Map<string, bigint>();
  let repartido = 0n;
  let baseAcumulada = 0n;
  for (const e of entradas) {
    baseAcumulada += e.base;
    const objetivo = proporcion(monto, baseAcumulada, total);
    partes.set(e.entradaId, objetivo - repartido);
    repartido = objetivo;
  }
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
