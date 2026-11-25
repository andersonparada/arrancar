import type {
  ClaseDeDocumentoDeVenta,
  TipoDeDocumentoDeVenta,
} from '../../core/contratos/libro-de-ventas.contratos.js';

/**
 * Familias fiscales de los documentos que la empresa emite (y la factura especial que le emite su comprador). El
 * recibo no va en los reportes de la SAT.
 */
export const TIPOS_DE_DOCUMENTO = [
  'factura',
  'factura_cambiaria',
  'factura_pequeno_contribuyente',
  'factura_pequeno_contribuyente_electronico',
  'factura_contribuyente_agropecuario',
  'factura_primario_pecuario',
  'factura_especial_recibida',
  'nota_de_credito',
  'nota_de_debito',
  'nota_de_abono',
  'recibo',
] as const satisfies readonly TipoDeDocumentoDeVenta[];
export type TipoDeDocumento = (typeof TIPOS_DE_DOCUMENTO)[number];

/** Los códigos SAT de cuatro letras de los DTE (siglas de las Reglas FEL; confirmar con la versión vigente). */
export const CODIGOS_DTE_DE_LA_FAMILIA = {
  factura: ['FACT'],
  factura_cambiaria: ['FCAM'],
  factura_pequeno_contribuyente: ['FPEQ', 'FCAP'],
  factura_pequeno_contribuyente_electronico: ['FAPE', 'FCPE'],
  factura_contribuyente_agropecuario: ['FACA', 'FCCA', 'FAAE', 'FCAE'],
  factura_primario_pecuario: ['FARP', 'FCRP', 'FPEC', 'FCPC'],
  factura_especial_recibida: ['FESP'],
  nota_de_credito: ['NCRE'],
  nota_de_debito: ['NDEB'],
  nota_de_abono: ['NABN'],
  recibo: ['RECI', 'RDON'],
} as const satisfies Record<TipoDeDocumento, readonly string[]>;

export type TipoDte = (typeof CODIGOS_DTE_DE_LA_FAMILIA)[TipoDeDocumento][number];

/** Todos los códigos DTE admitidos. */
export const TIPOS_DTE = Object.values(CODIGOS_DTE_DE_LA_FAMILIA).flat() as unknown as readonly [TipoDte, ...TipoDte[]];

/** La familia a la que pertenece cada código DTE. */
export const FAMILIA_DEL_TIPO_DTE = Object.fromEntries(
  TIPOS_DE_DOCUMENTO.flatMap((familia) => CODIGOS_DTE_DE_LA_FAMILIA[familia].map((codigo) => [codigo, familia])),
) as Record<TipoDte, TipoDeDocumento>;

/** Las familias que corrigen una factura: apuntan a ella (`documento_afectado_id`) o a una factura del sistema anterior. */
export const TIPOS_DE_NOTA = ['nota_de_credito', 'nota_de_debito', 'nota_de_abono'] as const;
export type TipoDeNota = (typeof TIPOS_DE_NOTA)[number];

export const esNota = (tipo: TipoDeDocumento): tipo is TipoDeNota =>
  (TIPOS_DE_NOTA as readonly string[]).includes(tipo);

/** Las familias de factura a las que una nota sí corrige: no la factura especial recibida, ni el recibo, ni otra nota. */
export const FAMILIAS_QUE_ADMITEN_NOTA: readonly TipoDeDocumento[] = [
  'factura',
  'factura_cambiaria',
  'factura_pequeno_contribuyente',
  'factura_pequeno_contribuyente_electronico',
  'factura_contribuyente_agropecuario',
  'factura_primario_pecuario',
];

/** Las familias que el Decreto 31-2024 derogó: solo se registran si se emitieron antes de la fecha de derogación. */
export const FAMILIAS_DEROGADAS: readonly TipoDeDocumento[] = [
  'factura_pequeno_contribuyente_electronico',
  'factura_contribuyente_agropecuario',
];

/** Lo que la factura le debe al cliente sube con los cargos y baja con los abonos. */
export function claseDeDocumento(tipo: TipoDeDocumento): ClaseDeDocumentoDeVenta {
  return tipo === 'nota_de_credito' || tipo === 'nota_de_abono' ? 'abono' : 'cargo';
}

/** Las familias que son deuda del cliente: la factura especial y el recibo no entran a la cartera. */
export const tieneCartera = (tipo: TipoDeDocumento): boolean =>
  tipo !== 'factura_especial_recibida' && tipo !== 'recibo';

/** Solo el recibo se queda fuera de los reportes de la SAT. */
export const muestraEnReportesSat = (tipo: TipoDeDocumento): boolean => tipo !== 'recibo';
