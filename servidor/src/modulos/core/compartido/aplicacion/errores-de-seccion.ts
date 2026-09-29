import { DatoInvalido } from '../dominio/errores.js';

/** Un problema de un campo de una sección aportada; `campo` va con su prefijo (`secciones.<módulo>.<campo>`). */
export interface ProblemaDeSeccion {
  campo: string;
  mensaje: string;
}

/**
 * La sección que un módulo aporta al formulario de otro trae datos inválidos. Los detalles llevan el mismo
 * formato que los de la validación de entrada, así el formulario los muestra junto a su campo.
 */
export class SeccionInvalida extends DatoInvalido {
  readonly codigo = 'validacion';

  constructor(problemas: readonly ProblemaDeSeccion[]) {
    super('Revise los datos enviados.', problemas);
  }
}
