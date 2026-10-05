import type { DocumentoDto } from './documento.dto.js';

/** Una nota de crédito que rebaja la factura de la ficha; el dinero, como texto con dos decimales. */
export interface NotaDeFacturaDto {
  id: string;
  serie: string | null;
  numero: string;
  fechaEmision: string;
  total: string;
  estado: 'vigente' | 'anulado';
}

/** La ficha de un documento guardado: el documento completo, su estado y lo que se puede hacer con él. */
export interface DocumentoFichaDto extends DocumentoDto {
  id: string;
  estado: 'vigente' | 'anulado';
  /** Momento de la anulación (ISO 8601); `null` si está vigente. */
  anuladoEn: string | null;
  anuladoPor: string | null;
  motivoDeAnulacion: string | null;
  /** Cuándo lo procesó el destino (ISO 8601); `null` si sigue pendiente. */
  procesadoEnDestinoEn: string | null;
  /** Lo calcula el servidor (ver `accionesDeDocumento`): vigente y sin notas de crédito vigentes. */
  puedeAnular: boolean;
  /** Lo calcula el servidor: vigente, pendiente en el destino y sin notas de crédito. */
  puedeEliminar: boolean;
  /** Las notas de crédito que rebajan esta factura, también las anuladas; vacío si no es una factura. */
  notas: NotaDeFacturaDto[];
}
