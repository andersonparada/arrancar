import type { LineaDeConteo } from './arqueos.js';
import { ConteoInvalido } from './errores-de-arqueos.js';

/** Billetes (Q200, 100, 50, 20, 10, 5, 1) y monedas (Q1, 0.50, 0.25, 0.10, 0.05, 0.01) de Guatemala, en centavos. */
export const DENOMINACIONES_EN_CENTAVOS: readonly number[] = [
  20000, 10000, 5000, 2000, 1000, 500, 100, 50, 25, 10, 5, 1,
];

const MAXIMO_DE_UNIDADES = 1_000_000;

/** Lo contado: Σ denominación × cantidad, en centavos enteros. */
export function totalDelConteo(conteo: readonly LineaDeConteo[]): number {
  return conteo.reduce((suma, { denominacionCentavos, cantidad }) => suma + denominacionCentavos * cantidad, 0);
}

function exigirLineaValida({ denominacionCentavos, cantidad }: LineaDeConteo): void {
  if (!DENOMINACIONES_EN_CENTAVOS.includes(denominacionCentavos)) {
    throw new ConteoInvalido(`La denominación ${denominacionCentavos} no es un billete ni una moneda de quetzales.`);
  }
  if (!Number.isInteger(cantidad) || cantidad < 0 || cantidad > MAXIMO_DE_UNIDADES) {
    throw new ConteoInvalido('Cada cantidad es un número entero, de cero en adelante.');
  }
}

/**
 * El conteo listo para guardar: sin líneas en cero, de la denominación más grande a la más chica.
 * @throws ConteoInvalido si una denominación no existe, se repite o una cantidad no es un entero.
 */
export function normalizarElConteo(conteo: readonly LineaDeConteo[]): LineaDeConteo[] {
  const vistas = new Set<number>();
  for (const linea of conteo) {
    exigirLineaValida(linea);
    if (vistas.has(linea.denominacionCentavos)) throw new ConteoInvalido('Una denominación aparece dos veces.');
    vistas.add(linea.denominacionCentavos);
  }
  return conteo
    .filter(({ cantidad }) => cantidad > 0)
    .map(({ denominacionCentavos, cantidad }) => ({ denominacionCentavos, cantidad }))
    .sort((a, b) => b.denominacionCentavos - a.denominacionCentavos);
}
