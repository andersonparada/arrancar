/**
 * Códigos de `VariablesDisponibles` que el selector de Monedas no ofrece (adenda B.8, P-B5): el quetzal (1, es la
 * base), las monedas europeas retiradas por el euro (4, 6, 8, 11 a 14, 27), el colón salvadoreño (17), los tres
 * bolívares (22, 37, 41), el DEG (26) y la Unidad de Cuenta del BID (28). No son monedas en circulación y se
 * confundirían con el euro (24).
 */
export const CODIGOS_DEL_BANGUAT_EXCLUIDOS: ReadonlySet<number> = new Set<number>([
  1, 4, 6, 8, 11, 12, 13, 14, 17, 22, 26, 27, 28, 37, 41,
]);

/**
 * Un código se ofrece (en el selector, al unirlo y en la muestra) si el Banguat todavía lo publica, no está excluido y
 * tiene convención comprobada (adenda B.8): sin ella no se sabe cómo pasarlo a quetzales.
 */
export function esCodigoOfrecido(
  moneda: { codigo: number; disponible: boolean; convencion: string | null },
  excluidos: ReadonlySet<number>,
): boolean {
  return moneda.disponible && !excluidos.has(moneda.codigo) && moneda.convencion !== null;
}
