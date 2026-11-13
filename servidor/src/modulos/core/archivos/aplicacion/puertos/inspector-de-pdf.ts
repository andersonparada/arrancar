export interface PdfInspeccionado {
  /** El PDF reescrito y normalizado: sin lo pegado al final y sin restricciones de propietario. */
  contenido: Buffer;
  paginas: number;
}

export type OrigenDeRevision = 'usuario' | 'sistema';

/** Quién pide la revisión: define su lugar en la fila (el `sistema` pasa delante y no cuenta para los topes). */
export interface TurnoDeRevision {
  cuentaId: string;
  origen: OrigenDeRevision;
}

/** Revisa un PDF que llegó de fuera y devuelve una copia limpia; no confía en nada de lo recibido. */
export interface InspectorDePdf {
  /**
   * @throws DocumentoNoAceptado si no empieza con la firma de PDF.
   * @throws PdfConContrasena si hace falta una contraseña para abrirlo.
   * @throws PdfDanado si no se puede leer.
   * @throws PdfConContenidoActivo si trae JavaScript, adjuntos, formularios u otras acciones.
   * @throws PdfConDemasiadasPaginas si pasa del máximo de páginas.
   * @throws PdfNoSePudoRevisar si la revisión pasó de los límites de tiempo o memoria, o si un turno del
   * `sistema` esperó demasiado en la fila.
   * @throws RevisionDePdfSaturada si la fila está llena, la cuenta está al tope o un turno de `usuario` esperó demasiado.
   */
  inspeccionar(contenido: Buffer, turno: TurnoDeRevision): Promise<PdfInspeccionado>;
}
