/** Cómo se llama un catálogo de Inventarios y qué impide eliminar un registro: de ahí salen todos sus mensajes. */
export interface DescripcionDeCatalogo {
  /** En minúsculas: «unidad de medida», «categoría», «artículo». */
  nombre: string;
  femenino: boolean;
  /** Lo que pierde el usuario al inactivar: «Dejará de ofrecerse al registrar artículos…». */
  alInactivar: string;
  /** Cuándo se puede eliminar: «si ningún artículo la usa». */
  sePuedeEliminar: string;
}

export interface TextosDeCatalogo {
  inactivado: string;
  reactivado: string;
  eliminado: string;
  preguntaDeEstado(activo: boolean, nombre: string): string;
  preguntaDeEliminar(nombre: string): string;
}

const conMayuscula = (texto: string): string => texto.charAt(0).toUpperCase() + texto.slice(1);

/** Los avisos y las preguntas de inactivar, reactivar y eliminar un registro de un catálogo. */
export function textosDeCatalogo(descripcion: DescripcionDeCatalogo): TextosDeCatalogo {
  const { nombre, femenino, alInactivar, sePuedeEliminar } = descripcion;
  const terminacion = femenino ? 'a' : 'o';
  const articulo = femenino ? 'la' : 'el';
  return {
    inactivado: `${conMayuscula(nombre)} inactivad${terminacion}.`,
    reactivado: `${conMayuscula(nombre)} reactivad${terminacion}.`,
    eliminado: `${conMayuscula(nombre)} eliminad${terminacion}.`,
    preguntaDeEstado: (activo, registro) =>
      activo
        ? `¿Inactivar ${articulo} ${nombre} «${registro}»? ${alInactivar}`
        : `¿Reactivar ${articulo} ${nombre} «${registro}»? Volverá a ofrecerse.`,
    preguntaDeEliminar: (registro) =>
      `¿Eliminar ${articulo} ${nombre} «${registro}»? Solo se puede ${sePuedeEliminar}; si ya se usó, inactív${femenino ? 'ela' : 'elo'}. Queda en la auditoría.`,
  };
}
