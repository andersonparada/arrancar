import type { ErrorDeImportacion } from './lectura-de-filas.js';
import type { ErrorEsperado } from '../../compartido/dominio/errores.js';

/** Algo que el usuario debe ver de una fila que sí se puede importar (por ejemplo, un dato que el sistema propuso). */
export type AvisoDeImportacion = ErrorDeImportacion;

/**
 * Qué pasó con el archivo: si se guardó, y los problemas por fila (con uno solo no se guarda nada).
 * `avisos` solo viene cuando el recurso los da y hay alguno.
 */
export interface ResultadoDeImportacion {
  filas: number;
  guardado: boolean;
  errores: ErrorDeImportacion[];
  avisos?: AvisoDeImportacion[];
}

/** Lo que el recurso quiere decir de una fila ya creada: la clave de la columna a la que se refiere y el texto. */
export interface AvisoDeFila {
  campo: string;
  mensaje: string;
}

/** El campo del formulario al que se refiere un error, si el error lo dice (`detalles.campo`). */
export function campoDelError(error: ErrorEsperado): string | null {
  const { campo } = (error.detalles ?? {}) as { campo?: unknown };
  return typeof campo === 'string' ? campo : null;
}
