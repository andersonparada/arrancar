import type { CausaDeAnulacion } from '../../dominio/baja-de-documento.js';
import type { MotivoSinCredito, TipoDeNota } from '../../dominio/tipos-de-documento.js';
import type { DocumentoDto } from './documento.dto.js';

/** Una nota de crédito (rebaja) o de débito (aumenta) de la factura de la ficha; el dinero, como texto con dos decimales. */
export interface NotaDeFacturaDto {
  id: string;
  tipo: TipoDeNota;
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
  /** Por qué se anuló el registro; `null` si está vigente. */
  causaDeAnulacion: CausaDeAnulacion | null;
  /** Cuándo lo procesó el destino (ISO 8601); `null` si sigue pendiente. */
  procesadoEnDestinoEn: string | null;
  /** Lo calcula el servidor (ver `accionesDeDocumento`): vigente y sin notas vigentes. */
  puedeAnular: boolean;
  /** Lo calcula el servidor: vigente, pendiente en el destino y sin notas (ni anuladas). */
  puedeEliminar: boolean;
  /** Solo en una nota (de crédito o de débito): el motivo sin crédito de su factura (derivado, no se guarda); `null` en los demás. */
  motivoDeLaFactura: MotivoSinCredito | null;
  /** Las notas de crédito y de débito de esta factura, también las anuladas; vacío si no es una factura. */
  notas: NotaDeFacturaDto[];
  /**
   * Solo en una factura: su total más las notas de débito vigentes menos las notas de crédito vigentes (derivado, no
   * se guarda); `null` en los demás.
   */
  totalAjustado: string | null;
}

/** Lo que responde anular: la ficha del documento anulado y los avisos que no bloquean (período que puede estar declarado). */
export interface AnulacionDeDocumentoDto {
  documento: DocumentoFichaDto;
  avisos: string[];
}

/** Lo que responde eliminar: solo los avisos que no bloquean (período que puede estar declarado). */
export interface EliminacionDeDocumentoDto {
  avisos: string[];
}
