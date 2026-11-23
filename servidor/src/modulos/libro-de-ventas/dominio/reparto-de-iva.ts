import { dividirRedondeando, repartirProporcional } from './aritmetica-fiscal.js';
import { CorreccionDeIvaExcedida } from './errores-de-documento.js';

/** Piso de lo que se puede apartar el IVA del DTE del calculado: Q0.05. */
export const TOLERANCIA_MINIMA_DE_IVA_EN_CENTAVOS = 5;

/** Lo que se puede apartar el IVA del DTE del calculado: `max(5, número de líneas)` centavos, porque cada línea redondea. */
export function toleranciaDeIvaEnCentavos(numeroDeLineas: number): number {
  return Math.max(TOLERANCIA_MINIMA_DE_IVA_EN_CENTAVOS, numeroDeLineas);
}

/**
 * IVA de un documento: `G − redondear(G / (1 + tasa))`, con `G` el gravado total en centavos y la tasa en centésimas
 * (12 % → 1200). Se calcula sobre el total y no línea por línea porque así coincide con el del DTE con más frecuencia.
 */
export function ivaDelDocumento(gravadoTotal: number, tasaEnCentesimas: number): number {
  const sinIva = dividirRedondeando(BigInt(gravadoTotal) * 10000n, BigInt(10000 + tasaEnCentesimas));
  return gravadoTotal - Number(sinIva);
}

function indiceDelMayor(gravados: readonly number[]): number {
  return gravados.reduce((mayor, gravado, indice) => (gravado > (gravados[mayor] ?? 0) ? indice : mayor), 0);
}

/** Aplica la diferencia con el IVA del DTE a la línea de mayor gravado, sin salirse de `0..gravado`. */
function corregir(ivas: number[], gravados: readonly number[], deseado: number): number[] {
  const diferencia = deseado - ivas.reduce((suma, iva) => suma + iva, 0);
  const tolerancia = toleranciaDeIvaEnCentavos(gravados.length);
  if (Math.abs(diferencia) > tolerancia) {
    throw new CorreccionDeIvaExcedida(
      `El IVA del documento se aparta más de Q${(tolerancia / 100).toFixed(2)} del calculado.`,
    );
  }
  const mayor = indiceDelMayor(gravados);
  const corregido = (ivas[mayor] ?? 0) + diferencia;
  if (corregido < 0 || corregido > (gravados[mayor] ?? 0)) {
    throw new CorreccionDeIvaExcedida('La corrección del IVA deja una línea con IVA fuera de su gravado.');
  }
  return ivas.map((iva, indice) => (indice === mayor ? corregido : iva));
}

/**
 * IVA de cada línea gravada: el del documento repartido en proporción al gravado de cada una (resto mayor), de modo
 * que la suma es exactamente el IVA del documento. Si llega el IVA del DTE (`ivaDelDte`, en centavos), la diferencia,
 * de hasta `max(5, líneas)` centavos, va a la línea de mayor gravado.
 */
export function repartirIva(
  gravados: readonly number[],
  tasaEnCentesimas: number,
  ivaDelDte?: number | null,
): number[] {
  const total = gravados.reduce((suma, gravado) => suma + gravado, 0);
  const ivas = repartirProporcional(ivaDelDocumento(total, tasaEnCentesimas), gravados);
  return ivaDelDte === null || ivaDelDte === undefined ? ivas : corregir(ivas, gravados, ivaDelDte);
}
