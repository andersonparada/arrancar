import type { DefinicionConfiguracion, NivelConfiguracion } from '../../modulos-sistema/definicion-modulo.js';

export type OrigenValor = NivelConfiguracion | 'predeterminado';

/** Valores encontrados en cada nivel para una variable; `undefined` si no se fijó. */
export interface ValoresPorNivel {
  empresa?: unknown;
  cuenta?: unknown;
  instalacion?: unknown;
}

export interface ValorResuelto<T = unknown> {
  valor: T;
  origen: OrigenValor;
}

const ORDEN_DE_PRIORIDAD: readonly NivelConfiguracion[] = ['empresa', 'cuenta', 'instalacion'];

/**
 * Elige el valor efectivo: el del nivel más específico que esté permitido para la
 * variable y que cumpla su esquema. Un valor guardado que ya no es válido (por
 * ejemplo, tras cambiar el esquema) se ignora y se usa el siguiente nivel.
 */
export function resolverValor<T>(definicion: DefinicionConfiguracion<T>, valores: ValoresPorNivel): ValorResuelto<T> {
  for (const nivel of ORDEN_DE_PRIORIDAD) {
    const candidato = valores[nivel];
    if (candidato === undefined || !definicion.niveles.includes(nivel)) continue;
    const validado = definicion.esquema.safeParse(candidato);
    if (validado.success) return { valor: validado.data, origen: nivel };
  }
  return { valor: definicion.predeterminado, origen: 'predeterminado' };
}
