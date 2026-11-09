import type { AccionesDelDocumento } from '../../dominio/acciones-posibles.js';
import type {
  ClaseDeDocumento,
  EstadoDeDocumento,
  OrigenDeDocumento,
  TipoDeDocumento,
} from '../../dominio/tipos-de-documento.js';

/**
 * Un documento por pagar tal como lo ven la bandeja, la lista y la ficha. El dinero va como texto con dos decimales.
 * `neto`, `aplicado` y `saldo` salen de cuentas (no se guardan): en un cargo, `saldo` es lo que todavía se debe; en
 * una nota de crédito, su saldo libre (a favor de la empresa); en un documento anulado, cero.
 */
export interface DocumentoPorPagarDto extends AccionesDelDocumento {
  id: string;
  origen: OrigenDeDocumento;
  /** El id del documento en Libro de compras (para enlazar a su ficha); nulo en un saldo inicial. */
  documentoId: string | null;
  tipo: TipoDeDocumento;
  clase: ClaseDeDocumento;
  estado: EstadoDeDocumento;
  proveedorId: string;
  proveedorNombre: string;
  serie: string | null;
  numero: string;
  fechaEmision: string;
  /** Nula en un saldo inicial, que no pasó por Libro de compras. */
  fechaRecepcion: string | null;
  /** Primer día del mes del libro en que quedó el documento; nulo en un saldo inicial. */
  periodo: string | null;
  /** Solo un cargo; una nota de crédito no vence. */
  vencimiento: string | null;
  vencido: boolean;
  documentoAfectadoId: string | null;
  tieneActivoFijo: boolean;
  total: string;
  retenciones: string;
  neto: string;
  aplicado: string;
  saldo: string;
  /** Solo un saldo inicial (nulos en los demás): lo que faltaba pagar al corte, sin retenciones. */
  saldoAlInicio: string | null;
  /** Solo un saldo inicial: las retenciones que la empresa aún no practicó (informativas, no restan del saldo). */
  retencionesPorPracticar: string | null;
  /** Solo un saldo inicial: cómo se llamaba el documento en el sistema anterior. */
  referencia: string | null;
  /** Solo un saldo inicial: pagos y notas anteriores a la fecha de inicio (derivado, no se guarda). */
  anterioresAlInicio: string | null;
  /** Quien opera lo registró en Libro de compras o lo completó: para autorizarlo necesita `autorizar-propios`. */
  esPropio: boolean;
  registradoEn: string | null;
  autorizadoEn: string | null;
  autorizacionPropia: boolean;
}

export interface PaginaDeDocumentosPorPagarDto {
  elementos: DocumentoPorPagarDto[];
  /** Cuántos documentos cumplen el filtro, sin contar la paginación. */
  total: number;
  pagina: number;
  limite: number;
}

/** La bandeja: todo lo pendiente, del más antiguo al más nuevo (hasta el tope que dice `limite`). */
export interface BandejaDto {
  elementos: DocumentoPorPagarDto[];
  /** Cuántos documentos pendientes hay en total; si pasa de `elementos`, la bandeja se recortó. */
  total: number;
}

/** Una nota de crédito o de débito de la factura de la ficha. */
export interface NotaDelDocumentoDto {
  id: string;
  documentoId: string | null;
  tipo: TipoDeDocumento;
  estado: EstadoDeDocumento;
  serie: string | null;
  numero: string;
  fechaEmision: string;
  total: string;
  /** Solo una nota de crédito: lo que rebajó de este documento. */
  aplicadoAEsteDocumento: string;
}

/** Cuánto de una nota de crédito rebajó de un cargo, con los datos para mostrar los dos. */
export interface AplicacionDelDocumentoDto {
  notaId: string;
  notaSerie: string | null;
  notaNumero: string;
  cargoId: string;
  cargoSerie: string | null;
  cargoNumero: string;
  monto: string;
}

/** La ficha: el documento, las notas que lo corrigen y las aplicaciones de notas de crédito (hechas o recibidas). */
export interface FichaDelDocumentoPorPagarDto extends DocumentoPorPagarDto {
  notas: NotaDelDocumentoDto[];
  aplicaciones: AplicacionDelDocumentoDto[];
  /** Cómo se anuló (de Libro de compras); `null` si el documento no está anulado. */
  anulacion: AnulacionDelDocumentoDto | null;
}

/** Por qué, quién y cuándo se anuló un documento. */
export interface AnulacionDelDocumentoDto {
  /** `error_de_captura`, `fel_anulada_por_el_emisor` o `no_corresponde_a_la_empresa`. */
  causa: string | null;
  motivo: string | null;
  /** Id del usuario que anuló. */
  anuladoPor: string | null;
  /** Nombres y apellidos de quien anuló; `null` si no se pudo leer al usuario. */
  anuladoPorNombre: string | null;
  /** Instante en ISO (UTC). */
  anuladoEn: string | null;
}

/** Una nota de crédito con saldo libre: a favor de la empresa frente al proveedor. */
export interface SaldoDeudorDto {
  id: string;
  documentoId: string | null;
  serie: string | null;
  numero: string;
  fechaEmision: string;
  saldoLibre: string;
}

/**
 * Lo que la empresa le debe a un proveedor. Los saldos deudores (el saldo libre de las notas de crédito, que el
 * proveedor le debe a la empresa) van aparte y no se restan de la deuda: se compensan con una factura futura o con un
 * reintegro del proveedor.
 */
export interface SaldoDelProveedorDto {
  proveedorId: string;
  proveedorNombre: string;
  /** Suma de lo que falta por pagar de sus cargos vigentes. */
  porPagar: string;
  /** La parte de `porPagar` que ya venció. */
  vencido: string;
  cargosConSaldo: number;
  /** Suma de los saldos libres de sus notas de crédito vigentes. */
  saldosDeudores: string;
  notasConSaldoLibre: SaldoDeudorDto[];
}

/** Un proveedor con documentos por pagar en la empresa: lo que necesita el filtro de la lista. */
export interface ProveedorConDocumentosDto {
  /** El id del papel de proveedor (el que usan los documentos). */
  id: string;
  nombre: string;
  /** Falso si el proveedor ya está inactivo en Terceros. */
  activo: boolean;
}

/** El documento anulado y los avisos que no bloquean (período declarado, retenciones por resolver) de Libro de compras. */
export interface DocumentoAnuladoDto extends DocumentoPorPagarDto {
  avisos: string[];
}
