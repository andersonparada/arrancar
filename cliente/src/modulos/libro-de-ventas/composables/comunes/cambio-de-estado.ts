/** Cómo se nombra un catálogo en las preguntas y avisos de inactivar, reactivar y eliminar. */
export interface NombreDeCatalogo {
  /** Con artículo, para la pregunta: «el concepto de ingreso». */
  conArticulo: string;
  /** Con mayúscula inicial, para el aviso: «Concepto de ingreso». */
  capitalizado: string;
}

/** La pregunta antes de inactivar o reactivar; dice qué pasará con lo ya registrado. */
export function mensajeDeCambioDeEstado(catalogo: NombreDeCatalogo, registro: { nombre: string; activo: boolean }) {
  const nombre = `${catalogo.conArticulo} «${registro.nombre}»`;
  return registro.activo
    ? `¿Inactivar ${nombre}? Dejará de ofrecerse al registrar ventas nuevas; lo ya registrado se conserva. Podrá reactivarlo cuando quiera.`
    : `¿Reactivar ${nombre}? Volverá a ofrecerse al registrar ventas nuevas.`;
}

/** El aviso al terminar el cambio. */
export const avisoDeCambioDeEstado = (catalogo: NombreDeCatalogo, activoAhora: boolean): string =>
  `${catalogo.capitalizado} ${activoAhora ? 'reactivado' : 'inactivado'}.`;

/** La pregunta antes de eliminar: dice que no se deshace y ofrece inactivar si ya se usó. */
export const mensajeDeEliminacion = (catalogo: NombreDeCatalogo, nombre: string): string =>
  `¿Eliminar ${catalogo.conArticulo} «${nombre}»? Se borra por completo y no se puede deshacer. Si ya tiene documentos, no se podrá eliminar: inactívelo para que no se ofrezca más.`;

/** Orden alfabético por nombre, sin distinguir mayúsculas ni acentos. */
export const ordenarPorNombre = <R extends { nombre: string }>(registros: R[]): R[] =>
  [...registros].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
