import type { AjusteDeSaldo } from './ajustes.js';
import type { LineaDePago, LineaDeReintegro } from './pagos.js';
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
  /** La factura que corrige una nota, por su id de aquí (del libro o un saldo inicial); nulo en lo demás. */
  documentoAfectadoId: string | null;
  /**
   * La nota corrige una factura del sistema anterior (U8l): con `documentoAfectadoId` es su saldo inicial; sin él, la
   * factura no está cargada y la nota queda libre (o es un cargo suelto).
   */
  facturaDelSistemaAnterior: boolean;
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

/** Cómo nació una aplicación: con la recepción de la nota (`automatica`), la hizo un usuario (`manual`) o la repartió una contraseña (`contrasena`). */
export type FormaDeAplicacion = 'automatica' | 'manual' | 'contrasena';

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

/** La contraseña vigente donde está un documento (a lo más una). */
export interface ContrasenaVigente {
  id: string;
  numero: number;
  anioDeNumero: number;
}

/** Una contraseña en que estuvo o está un documento. */
export interface ContrasenaDelDocumentoGuardada extends ContrasenaVigente {
  estado: 'vigente' | 'anulada';
}

/** Un documento con lo que rebajó (si es una nota) y lo que le rebajaron (si es un cargo), y sus ajustes (si es una nota). */
export interface DocumentoConAplicaciones {
  documento: DocumentoPorPagar;
  /** Todos los ajustes de la nota, también los anulados; vacío en un cargo. */
  ajustes: AjusteDeSaldo[];
  hechas: AplicacionDeNota[];
  recibidas: AplicacionDeNota[];
  /** La contraseña vigente en que está el documento; `null` si no está en ninguna (las anuladas no cuentan). */
  contrasenaVigente: ContrasenaVigente | null;
  /** Todas las contraseñas en que estuvo (vigente y anuladas): quedan en la auditoría si el documento se elimina. */
  contrasenas: ContrasenaDelDocumentoGuardada[];
  /** Cuántas notas (vigentes y anuladas) lo corrigen: un saldo inicial con notas ya tiene movimientos. */
  notasQueLoCorrigen: number;
  /** Lo que los pagos entregaron a este cargo, vigentes y anulados, del más antiguo al más nuevo; vacío en una nota. */
  pagos: LineaDePago[];
  /** Lo que los reintegros devolvieron contra esta nota, vigentes y anulados; vacío en un cargo. */
  reintegros: LineaDeReintegro[];
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
