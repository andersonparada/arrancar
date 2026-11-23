import type { CifrasDeBaja } from './tipos-de-baja.js';

/** El resultado de vender, en centavos: contable contra el valor en libros y fiscal contra lo que faltaba deducir. */
export interface ResultadosDeVenta {
  contableCentavos: number;
  fiscalCentavos: number;
}

/**
 * Contable = precio − valor en libros; fiscal = precio − (costo fiscal − depreciación fiscal acumulada) (A1): así lo que
 * no se depreció en el libro fiscal (el exceso sobre la matrícula, el valor como ganado común) se recupera en la venta.
 */
export function resultadosDeVenta(precioCentavos: number, cifras: CifrasDeBaja): ResultadosDeVenta {
  return {
    contableCentavos: precioCentavos - cifras.valorEnLibrosCentavos,
    fiscalCentavos: precioCentavos - (cifras.costoFiscalCentavos - cifras.depreciacionAcumuladaFiscalCentavos),
  };
}

/**
 * Reparte un monto en centavos entre varios activos en proporción a sus pesos (su costo): cada uno recibe el piso de su
 * parte y el último el sobrante, así la suma siempre es el monto. Con pesos todos en cero reparte por igual.
 */
export function repartirEnProporcion(totalCentavos: number, pesos: readonly number[]): number[] {
  const suma = pesos.reduce((total, peso) => total + peso, 0);
  const usados = suma > 0 ? pesos : pesos.map(() => 1);
  const base = BigInt(usados.reduce((total, peso) => total + peso, 0));
  const partes = usados.map((peso) => Number((BigInt(totalCentavos) * BigInt(peso)) / base));
  const asignado = partes.slice(0, -1).reduce((total, parte) => total + parte, 0);
  partes[partes.length - 1] = totalCentavos - asignado;
  return partes;
}
