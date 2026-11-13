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

declare const marcaDeDocumentoRevisado: unique symbol;

/** Contenido ya revisado, listo para guardarse. Es opaco: solo se obtiene con `revisar`. */
export interface DocumentoRevisado {
  readonly [marcaDeDocumentoRevisado]: true;
}

export interface DocumentoAbierto {
  tipoMime: string;
  tamanoBytes: number;
  /** Huella del contenido guardado. */
  sha256: string | null;
  creadoEn: Date;
  contenido: Readable;
}

/**
 * Documentos (PDF o foto de un documento) que pertenecen a un recurso de un módulo, por ejemplo el
 * estado de cuenta de una conciliación. Se revisan antes de guardarse y solo se abren a través del
 * módulo dueño, con su permiso. Se usan dentro de la unidad de trabajo del módulo.
 */
export interface DocumentosProtegidos {
  /**
   * Revisa el contenido (por lo que es, no por lo que diga el cliente) sin tocar la base ni el disco. Llámese
   * FUERA de la unidad de trabajo: qpdf tarda y no debe retener una conexión del grupo mientras espera.
   * Con una transacción en curso falla con un error de programación.
   * Los PDF esperan su turno en la fila de revisión como `usuario`, con el tope de la cuenta del operador.
   * @throws DocumentoNoAceptado, DocumentoDemasiadoGrande, o un error de PDF o de foto (todos previstos).
   * @throws RevisionDePdfSaturada (429) si la fila está llena o la cuenta ya tiene 2 revisiones en curso.
   */
  revisar(operador: Operador, contenido: Buffer, nombre: string | null): Promise<DocumentoRevisado>;
  /**
   * Escribe en disco el documento revisado y registra la fila. Llámese dentro de la unidad de trabajo: si se
   * deshace (también por un error posterior o del `commit`), el archivo se borra del disco. Solo acepta lo que
   * devolvió `revisar`.
   */
  guardarRevisado(
    operador: Operador,
    documento: DocumentoRevisado,
    opciones: Pick<OpcionesDeDocumento, 'recursoDueno'>,
  ): Promise<DocumentoGuardado>;
  /**
   * `revisar` + `guardarRevisado` juntos, para quien no puede revisar antes de abrir la transacción (el contenido
   * depende de lo que lee dentro de ella). Retiene la conexión mientras se revisa; su PDF pasa como turno `sistema`
   * (delante de los de usuario y sin sus topes por cuenta ni de fila).
   * **Nunca debe recibir contenido subido por un usuario**: se salta los topes de la fila; para eso está `revisar`.
   */
  guardar(operador: Operador, contenido: Buffer, opciones: OpcionesDeDocumento): Promise<DocumentoGuardado>;
  /** @throws RecursoNoEncontrado si no existe, es de otra empresa, de otro dueño o falta en el disco. */
  abrir(archivoId: string, recursoDueno: string): Promise<DocumentoAbierto>;
  /**
   * Borra la fila ya y el archivo del disco solo cuando la transacción se confirma (si se deshace, la fila vuelve y
   * el archivo sigue en su lugar).
   */
  eliminar(archivoId: string, recursoDueno: string): Promise<void>;
}
