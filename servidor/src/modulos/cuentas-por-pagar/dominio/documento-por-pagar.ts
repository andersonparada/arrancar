import type { AjusteDeSaldo } from './ajustes.js';
import type { EstadoDeDocumento, OrigenDeDocumento, TipoDeDocumento } from './tipos-de-documento.js';

/** Un documento de Libro de compras recibido en Cuentas por pagar. El dinero va en centavos enteros. */
export interface DocumentoPorPagar {
  id: string;
  origen: OrigenDeDocumento;
  /** El id del documento en Libro de compras; nulo en un saldo inicial. */
  documentoId: string | null;
  /** Serie del documento (copiada del libro, o escrita en un saldo inicial); puede faltar. */
  serie: string | null;
  numero: string;
  tipo: TipoDeDocumento;
  proveedorId: string;
  /** La factura (id de Libro de compras) de una nota. */
  documentoAfectadoId: string | null;
  /** `AAAA-MM-DD`. */
  fechaEmision: string;
  totalCentavos: number;
  retencionesCentavos: number;
  /** Solo el saldo inicial: lo que faltaba pagarle al proveedor al corte, sin retenciones. */
  saldoAlInicioCentavos: number | null;
  /** Solo el saldo inicial: la parte de las retenciones que la empresa todavía no practicó (informativa). */
  retencionesPorPracticarCentavos: number | null;
  /** Solo el saldo inicial: cómo se llama el documento en el sistema anterior. */
  referencia: string | null;
  tieneActivoFijo: boolean;
  /** `AAAA-MM-DD`; nulo en las notas de crédito, que no vencen. */
  vencimiento: string | null;
  estado: EstadoDeDocumento;
  /** Quien lo registró en Libro de compras (`creado_por`): cuenta para la separación de funciones al autorizar. */
  ingresadoPor: string | null;
  /** Cuándo y quién lo completó en la bandeja (fecha y hora ISO); nulos mientras esté pendiente. */
  registradoEn: string | null;
  registradoPor: string | null;
  autorizadoEn: string | null;
  autorizadoPor: string | null;
  /** Se autorizó una excepción a la separación de funciones: quien lo autorizó también lo ingresó o lo completó. */
  autorizacionPropia: boolean;
}

/** Cómo nació una aplicación: con la recepción de la nota (`automatica`) o la hizo un usuario (`manual`). */
export type FormaDeAplicacion = 'automatica' | 'manual';

/** Una nota de crédito que rebaja un cargo, por un monto en centavos. */
export interface AplicacionDeNota {
  id: string;
  notaId: string;
  cargoId: string;
  montoCentavos: number;
  forma: FormaDeAplicacion;
  /** `AAAA-MM-DD`: desde cuándo rebaja. */
  fecha: string;
  /** La del acuerdo de compensación; solo en las manuales. */
  referencia: string | null;
  /** Serie y número del otro documento: la nota en lo `recibido` por un cargo, el cargo en lo `hecho` por una nota. */
  otraSerie: string | null;
  otroNumero: string;
}

/** Un documento con lo que rebajó (si es una nota) y lo que le rebajaron (si es un cargo), y sus ajustes (si es una nota). */
export interface DocumentoConAplicaciones {
  documento: DocumentoPorPagar;
  /** Todos los ajustes de la nota, también los anulados; vacío en un cargo. */
  ajustes: AjusteDeSaldo[];
  hechas: AplicacionDeNota[];
  recibidas: AplicacionDeNota[];
}

/**
 * Lo que se le paga al proveedor por un cargo: el total menos lo retenido, que es de la SAT. En un saldo inicial es lo
 * que faltaba pagar al corte (ya neto de todas las retenciones).
 */
export function netoDe({ totalCentavos, retencionesCentavos, saldoAlInicioCentavos }: DocumentoPorPagar): number {
  return saldoAlInicioCentavos ?? totalCentavos - retencionesCentavos;
}

/** Cómo se nombra un documento ante el usuario: `serie-número`, o solo el número si no tiene serie. */
export function etiquetaDe({ serie, numero }: Pick<DocumentoPorPagar, 'serie' | 'numero'>): string {
  return serie ? `${serie}-${numero}` : numero;
}
