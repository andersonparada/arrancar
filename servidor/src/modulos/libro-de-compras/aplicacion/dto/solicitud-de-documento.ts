import type { DestinoDeDocumento } from '../../dominio/destinos-de-documento.js';
import type { MotivoFueraDelLibro } from '../../dominio/fuera-del-libro.js';
import type { ReglaDeRetencion } from '../../dominio/retencion-propuesta.js';
import type { TipoDeDocumento } from '../../dominio/tipos-de-documento.js';

/** Una línea tal como llega: los montos como texto (`"1250.50"`), sin ningún cálculo. */
export interface SolicitudDeLinea {
  conceptoId: string;
  descripcion: string | null;
  /** `null`: el tipo por omisión del concepto. */
  tipo: 'bien' | 'servicio' | null;
  /** `null`: lo que diga el concepto. */
  esActivoFijo: boolean | null;
  /** Con combustible van también los galones; la tasa de IDP sale de su vigencia en la fecha de emisión. */
  combustibleId: string | null;
  galones: string | null;
  total: string;
  exento: string | null;
}

/** Lo que el usuario dejó de una retención propuesta; `monto` es el final (`"0"` la quita). */
export interface AjusteDeRetencionSolicitado {
  regla: ReglaDeRetencion;
  monto: string;
  motivo: string | null;
}

/** Lo que llega al calcular o registrar un documento de compra. */
export interface SolicitudDeDocumento {
  tipo: TipoDeDocumento;
  proveedorId: string;
  destino: DestinoDeDocumento;
  /** NIT del emisor que dice el DTE; en el libro es obligatorio. */
  nitEmisor: string | null;
  serie: string | null;
  numero: string;
  autorizacionFel: string | null;
  /** NIT al que se emitió la FEL; obligatorio si queda fuera del libro por una FEL a otro NIT o a consumidor final. */
  nitReceptor: string | null;
  /** `null`: el documento va en el libro. */
  motivoFueraDelLibro: MotivoFueraDelLibro | null;
  /** La compra no es de la actividad gravada: el IVA no da crédito. */
  noVinculado: boolean;
  fechaEmision: string;
  /** `null`: hoy. */
  fechaRecepcion: string | null;
  /** Primer día del mes; `null`: el que propone el dominio (mes de recepción, nunca antes del de emisión). */
  periodo: string | null;
  /** Solo en las notas de crédito. */
  documentoAfectadoId: string | null;
  /** IVA que dice la FEL, para corregir el calculado (hasta `max(5, líneas)` centavos de diferencia). */
  ivaDeLaFel: string | null;
  observaciones: string | null;
  lineas: SolicitudDeLinea[];
  ajustesDeRetenciones: AjusteDeRetencionSolicitado[];
}
