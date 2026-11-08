/** Error de programación: se pidió revisar un documento con una transacción abierta, reteniendo su conexión. */
export class RevisionDentroDeTransaccion extends Error {
  constructor() {
    super('revisar debe llamarse fuera de la unidad de trabajo: qpdf tarda y retendría una conexión del grupo.');
  }
}

/** Error de programación: se intentó guardar algo que no salió de `revisar`. */
export class DocumentoSinRevisar extends Error {
  constructor() {
    super('Solo se puede guardar un documento devuelto por revisar.');
  }
}
