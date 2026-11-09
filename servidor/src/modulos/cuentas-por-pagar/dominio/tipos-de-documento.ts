import type { TipoDeDocumentoDeCompra } from '../../core/contratos/libro-de-compras.contratos.js';

/** Las nueve familias de documento que Libro de compras puede enviar. */
export const TIPOS_DE_DOCUMENTO = [
  'factura',
  'factura_pequeno_contribuyente',
  'factura_pequeno_contribuyente_electronico',
  'factura_contribuyente_agropecuario',
  'factura_primario_pecuario',
  'factura_especial',
  'nota_de_credito',
  'nota_de_debito',
  'recibo',
] as const satisfies readonly TipoDeDocumentoDeCompra[];

/** Los seis tipos de factura: para no deber dos veces el mismo documento cuentan como uno (índice único por familia). */
export const TIPOS_DE_FACTURA = [
  'factura',
  'factura_pequeno_contribuyente',
  'factura_pequeno_contribuyente_electronico',
  'factura_contribuyente_agropecuario',
  'factura_primario_pecuario',
  'factura_especial',
] as const satisfies readonly TipoDeDocumentoDeCompra[];

/** De dónde viene un documento por pagar: del Libro de compras o cargado como saldo inicial. */
export const ORIGENES_DE_DOCUMENTO = ['libro_de_compras', 'saldo_inicial'] as const;
export type OrigenDeDocumento = (typeof ORIGENES_DE_DOCUMENTO)[number];

export type TipoDeDocumento = TipoDeDocumentoDeCompra;

/** Un cargo suma a lo que se debe (con vencimiento); un abono lo rebaja (la nota de crédito, sin vencimiento). */
export type ClaseDeDocumento = 'cargo' | 'abono';

export function claseDe(tipo: TipoDeDocumento): ClaseDeDocumento {
  return tipo === 'nota_de_credito' ? 'abono' : 'cargo';
}

export const ESTADOS_DE_DOCUMENTO = ['pendiente', 'registrado', 'autorizado', 'anulado'] as const;
export type EstadoDeDocumento = (typeof ESTADOS_DE_DOCUMENTO)[number];

/** El destino con que Libro de compras envía lo que llega aquí. */
export const DESTINO_PROPIO = 'cuentas-por-pagar';
