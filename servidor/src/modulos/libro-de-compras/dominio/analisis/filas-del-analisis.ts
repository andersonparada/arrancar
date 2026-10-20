import type { MotivoSinCredito, TipoDte } from '../tipos-de-documento.js';

/** Todo el dinero va en centavos enteros y con signo: las notas de crédito restan. */

export interface CompraDeProveedor {
  proveedorId: string;
  nit: string | null;
  nombre: string;
  documentos: number;
  total: number;
  base: number;
  ivaConCredito: number;
  ivaSinCredito: number;
  exentoYNoAfecto: number;
  idp: number;
  retenido: number;
  /** Lo que se paga al proveedor: el total menos lo retenido. */
  neto: number;
}

export interface CompraDeConcepto {
  conceptoId: string;
  concepto: string;
  tipo: 'bien' | 'servicio';
  lineas: number;
  base: number;
  ivaConCredito: number;
  ivaAlCosto: number;
  /** `total − iva + iva_no_acreditable` de la línea. */
  costo: number;
}

/** El documento al que pertenece una línea de un análisis. */
export interface DocumentoDeLinea {
  documentoId: string;
  periodo: string;
  fecha: string;
  tipoDte: TipoDte | null;
  serie: string | null;
  numero: string;
  nitDelProveedor: string | null;
  proveedor: string;
}

export interface IvaAlCostoDeLinea extends DocumentoDeLinea {
  motivo: MotivoSinCredito | null;
  numeroDeLinea: number;
  concepto: string;
  ivaAlCosto: number;
}

export interface ActivoFijoComprado extends DocumentoDeLinea {
  numeroDeLinea: number;
  concepto: string;
  descripcion: string | null;
  costo: number;
  ivaConCredito: number;
}

export interface CombustibleDelMes {
  /** `null` cuando la línea solo trae el IDP escrito de la factura, sin combustible del catálogo. */
  combustible: string | null;
  periodo: string;
  /** En milésimas de galón. */
  galones: number;
  idp: number;
  base: number;
  iva: number;
  exentoYNoAfecto: number;
  /** El mes tiene compras en una vigencia con IVA exento (Decreto 22-2026). */
  exentoPorDecreto: boolean;
  lineasConIdpSinGalones: number;
}
