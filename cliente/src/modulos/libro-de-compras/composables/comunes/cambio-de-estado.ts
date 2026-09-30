/** Cómo se nombra un catálogo en las preguntas y avisos de inactivar y reactivar. */
export interface NombreDeCatalogo {
  /** Con artículo, para la pregunta: «el concepto de gasto». */
  conArticulo: string;
  /** Con mayúscula inicial, para el aviso: «Concepto de gasto». */
  capitalizado: string;
}

/** La pregunta antes de inactivar o reactivar; dice qué pasará con lo ya registrado. */
export function mensajeDeCambioDeEstado(catalogo: NombreDeCatalogo, registro: { nombre: string; activo: boolean }) {
  const nombre = `${catalogo.conArticulo} «${registro.nombre}»`;
  return registro.activo
    ? `¿Inactivar ${nombre}? Dejará de ofrecerse al registrar compras nuevas; lo ya registrado se conserva. Podrá reactivarlo cuando quiera.`
    : `¿Reactivar ${nombre}? Volverá a ofrecerse al registrar compras nuevas.`;
}

/** El aviso al terminar el cambio. */
export const avisoDeCambioDeEstado = (catalogo: NombreDeCatalogo, activoAhora: boolean): string =>
  `${catalogo.capitalizado} ${activoAhora ? 'reactivado' : 'inactivado'}.`;

/** Orden alfabético por nombre, sin distinguir mayúsculas ni acentos. */
export const ordenarPorNombre = <R extends { nombre: string }>(registros: R[]): R[] =>
  [...registros].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
