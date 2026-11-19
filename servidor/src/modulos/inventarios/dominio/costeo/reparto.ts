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
