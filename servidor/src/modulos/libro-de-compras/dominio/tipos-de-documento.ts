/**
 * Familias fiscales de documento: lo que decide el crédito, el motivo y las retenciones. El recibo solo va con la
 * casilla «Se muestra en reportes SAT» desmarcada.
 *
 * Reservadas, fuera de esta lista y de los checks hasta su propio paso: `factura_especifica` (FEPE, lleva ICT) y
 * `duca` (sin serie ni FEL); agregarlas es un cambio de check sin datos que convertir.
 */
export const TIPOS_DE_DOCUMENTO = [
  'factura',
  'factura_pequeno_contribuyente',
  'factura_pequeno_contribuyente_electronico',
  'factura_contribuyente_agropecuario',
  'factura_primario_pecuario',
  'factura_especial',
  'nota_de_credito',
  'recibo',
] as const;
export type TipoDeDocumento = (typeof TIPOS_DE_DOCUMENTO)[number];

/** Por qué un documento no da crédito fiscal; nulo si lo da. */
export const MOTIVOS_SIN_CREDITO = [
  'fuera_de_plazo',
  'no_vinculado',
  'pequeno_contribuyente',
  'contribuyente_agropecuario',
  'primario_pecuario',
  'exento',
  'empresa_sin_credito',
] as const;
export type MotivoSinCredito = (typeof MOTIVOS_SIN_CREDITO)[number];

/** Los códigos SAT de cuatro letras de los DTE (siglas de las Reglas FEL; confirmar con la versión vigente). */
export const CODIGOS_DTE_DE_LA_FAMILIA = {
  factura: ['FACT', 'FCAM'],
  factura_pequeno_contribuyente: ['FPEQ', 'FCAP'],
  factura_pequeno_contribuyente_electronico: ['FAPE', 'FCPE'],
  factura_contribuyente_agropecuario: ['FACA', 'FCCA', 'FAAE', 'FCAE'],
  factura_primario_pecuario: ['FARP', 'FCRP', 'FPEC', 'FCPC'],
  factura_especial: ['FESP'],
  nota_de_credito: ['NCRE'],
  recibo: ['RECI', 'RDON'],
} as const satisfies Record<TipoDeDocumento, readonly string[]>;

export type TipoDte = (typeof CODIGOS_DTE_DE_LA_FAMILIA)[TipoDeDocumento][number];

/** Todos los códigos DTE admitidos. */
export const TIPOS_DTE = Object.values(CODIGOS_DTE_DE_LA_FAMILIA).flat() as unknown as readonly [TipoDte, ...TipoDte[]];

/** La familia a la que pertenece cada código DTE. */
export const FAMILIA_DEL_TIPO_DTE = Object.fromEntries(
  TIPOS_DE_DOCUMENTO.flatMap((familia) => CODIGOS_DTE_DE_LA_FAMILIA[familia].map((codigo) => [codigo, familia])),
) as Record<TipoDte, TipoDeDocumento>;

/** El motivo propio de cada familia sin IVA; las demás no tienen (decide el cálculo). */
export const MOTIVO_DE_LA_FAMILIA: Partial<Record<TipoDeDocumento, MotivoSinCredito>> = {
  factura_pequeno_contribuyente: 'pequeno_contribuyente',
  factura_pequeno_contribuyente_electronico: 'pequeno_contribuyente',
  factura_contribuyente_agropecuario: 'contribuyente_agropecuario',
  factura_primario_pecuario: 'primario_pecuario',
};

/** Desde cuándo existe el DTE del primario y pecuario (Decreto 31-2024); antes no se emitía. */
export const INICIO_DEL_PRIMARIO_Y_PECUARIO = '2025-04-09';

/** Los motivos de las familias que no cobran IVA: una nota de crédito sobre ellas tampoco lo cobra. */
export const MOTIVOS_SIN_IVA: readonly MotivoSinCredito[] = Object.values(MOTIVO_DE_LA_FAMILIA);
