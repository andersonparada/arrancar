/** Tipos de documento del libro (el recibo solo va con la casilla «Se muestra en reportes SAT» desmarcada). */
export const TIPOS_DE_DOCUMENTO = ['factura', 'factura_pequeno_contribuyente', 'nota_de_credito', 'recibo'] as const;
export type TipoDeDocumento = (typeof TIPOS_DE_DOCUMENTO)[number];

/** Por qué un documento no da crédito fiscal; nulo si lo da. */
export const MOTIVOS_SIN_CREDITO = ['fuera_de_plazo', 'no_vinculado', 'pequeno_contribuyente', 'exento'] as const;
export type MotivoSinCredito = (typeof MOTIVOS_SIN_CREDITO)[number];
