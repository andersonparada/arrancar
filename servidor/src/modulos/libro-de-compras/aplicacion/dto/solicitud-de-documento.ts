import type { DatosFiscalesPedidos } from '../../dominio/datos-fiscales-del-documento.js';
import type { DestinoDeDocumento } from '../../dominio/destinos-de-documento.js';
import type { MotivoFueraDelLibro } from '../../dominio/fuera-del-libro.js';
import type { ClaseDeCargo } from '../../dominio/reglas-de-notas-de-debito.js';
import type { ReglaDeRetencion } from '../../dominio/retencion-propuesta.js';
import type { TipoDeDocumento, TipoDte } from '../../dominio/tipos-de-documento.js';

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

/** Lo que llega al calcular o registrar un documento de compra, con su tipo ya resuelto. */
export interface SolicitudDeDocumento {
  /** La familia fiscal: la que dice `tipo` o la que se deduce de `tipoDte`. */
  tipo: TipoDeDocumento;
  /** El código de la SAT (`FACT`, `FPEQ`, `NCRE`...); obligatorio con FEL y `null` sin ella. */
  tipoDte: TipoDte | null;
  proveedorId: string;
  /** `null` solo en la vista previa, que se calcula sin destino; registrar siempre lo trae. */
  destino: DestinoDeDocumento | null;
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
  /** La factura que corrige; obligatoria en las notas de crédito y de débito, y solo ahí. */
  documentoAfectadoId: string | null;
  /** Solo en la nota de débito: por qué cobra. No se guarda; sirve para avisar (intereses). */
  claseDeCargo?: ClaseDeCargo | null;
  /** IVA que dice la FEL, para corregir el calculado (hasta `max(5, líneas)` centavos de diferencia). */
  ivaDeLaFel: string | null;
  observaciones: string | null;
  lineas: SolicitudDeLinea[];
  ajustesDeRetenciones: AjusteDeRetencionSolicitado[];
  /**
   * Régimen de ISR y si es agente del IVA, para un proveedor sin datos fiscales guardados: obligatorios en una
   * factura del libro si la empresa retiene algo; se guardan con el documento. `null`: no vino.
   */
  datosFiscalesDelProveedor: DatosFiscalesPedidos | null;
  /** El tipo no corresponde al régimen guardado del proveedor, pero el usuario confirma que cambió de régimen. */
  confirmarCambioDeRegimen: boolean;
}

/**
 * La solicitud tal como llega: el tipo se dice con la familia (`tipo`), con el código de la SAT (`tipoDte`) o con los
 * dos (deben coincidir). `PreparadorDeDocumento` lo resuelve.
 */
export type SolicitudSinResolver = Omit<SolicitudDeDocumento, 'tipo' | 'tipoDte'> & {
  tipo?: TipoDeDocumento | null;
  tipoDte?: TipoDte | null;
};
