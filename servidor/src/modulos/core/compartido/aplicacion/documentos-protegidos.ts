import type { Readable } from 'node:stream';
import type { Operador } from './operador.js';

export interface OpcionesDeDocumento {
  /** Nombre que tenía el archivo al subirlo (solo para mostrar). */
  nombre: string | null;
  /** Recurso dueño, p. ej. `bancos.conciliaciones`: solo se sirve desde la ruta de ese módulo. */
  recursoDueno: string;
}

export interface DocumentoGuardado {
  id: string;
  tipoMime: string;
  /** Huella del contenido guardado (ya revisado y reescrito). */
  sha256: string;
  tamanoBytes: number;
  /** Solo los PDF cuentan páginas. */
  paginas: number | null;
}

export interface DocumentoAbierto {
  tipoMime: string;
  tamanoBytes: number;
  contenido: Readable;
}

/**
 * Documentos (PDF o foto de un documento) que pertenecen a un recurso de un módulo, por ejemplo el
 * estado de cuenta de una conciliación. Se revisan antes de guardarse y solo se abren a través del
 * módulo dueño, con su permiso. Se usan dentro de la unidad de trabajo del módulo.
 */
export interface DocumentosProtegidos {
  /**
   * Revisa el contenido (por lo que es, no por lo que diga el cliente), lo guarda en disco y registra
   * la fila; si el registro falla, borra el archivo.
   * @throws DocumentoNoAceptado, DocumentoDemasiadoGrande, o un error de PDF o de foto (todos previstos).
   */
  guardar(operador: Operador, contenido: Buffer, opciones: OpcionesDeDocumento): Promise<DocumentoGuardado>;
  /** @throws RecursoNoEncontrado si no existe, es de otra empresa, de otro dueño o falta en el disco. */
  abrir(archivoId: string, recursoDueno: string): Promise<DocumentoAbierto>;
  /** Borra la fila y el archivo. Llámese como último paso de la unidad de trabajo. */
  eliminar(archivoId: string, recursoDueno: string): Promise<void>;
}
