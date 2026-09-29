export interface PdfInspeccionado {
  /** El PDF reescrito y normalizado: sin lo pegado al final y sin restricciones de propietario. */
  contenido: Buffer;
  paginas: number;
}

/** Revisa un PDF que llegó de fuera y devuelve una copia limpia; no confía en nada de lo recibido. */
export interface InspectorDePdf {
  /**
   * @throws DocumentoNoAceptado si no empieza con la firma de PDF.
   * @throws PdfConContrasena si hace falta una contraseña para abrirlo.
   * @throws PdfDanado si no se puede leer.
   * @throws PdfConContenidoActivo si trae JavaScript, adjuntos, formularios u otras acciones.
   * @throws PdfConDemasiadasPaginas si pasa del máximo de páginas.
   * @throws PdfNoSePudoRevisar si la revisión pasó de los límites de tiempo o memoria.
   */
  inspeccionar(contenido: Buffer): Promise<PdfInspeccionado>;
}
