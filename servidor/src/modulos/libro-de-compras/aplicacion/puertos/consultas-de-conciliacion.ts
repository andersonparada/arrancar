import type { RangoDeLote } from '../../dominio/conciliacion/cobertura-de-la-sat.js';
import type { DocumentoConciliable, FilaConciliable } from '../../dominio/conciliacion/tipos-de-conciliacion.js';

/** Lo que la conciliación lee de Arrancar. RLS limita todo a la empresa de la transacción. */
export interface ConsultasDeConciliacion {
  /**
   * Los documentos vigentes del período que van en el libro, y los vigentes (de cualquier período) que cruzan con una
   * fila emitida en el mes, por autorización o por NIT, serie y número.
   */
  documentos(periodo: string): Promise<DocumentoConciliable[]>;
  /**
   * Las filas de la bandeja (cualquier estado) emitidas en el mes, y las de cualquier fecha que cruzan con un documento
   * del libro del período.
   */
  filas(periodo: string): Promise<FilaConciliable[]>;
  /** Las fechas de emisión que trajo cada lote de la bandeja (los de conciliación liviana no cuentan). */
  rangosDeLotes(): Promise<RangoDeLote[]>;
}
