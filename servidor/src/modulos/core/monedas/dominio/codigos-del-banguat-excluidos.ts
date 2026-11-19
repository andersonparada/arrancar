/**
 * Códigos de `VariablesDisponibles` que el selector de Monedas no ofrece: los derechos especiales de giro (DEG), los
 * bolívares retirados y el colón salvadoreño (decisión D-2). La comprobación C-1 con el Banguat real los llena; hasta
 * entonces la lista está vacía (la semilla de monedas tampoco incluye esas monedas).
 */
export const CODIGOS_DEL_BANGUAT_EXCLUIDOS: ReadonlySet<number> = new Set<number>();
