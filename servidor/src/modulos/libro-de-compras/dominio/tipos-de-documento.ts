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
  'nota_de_debito',
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
  /** Nota de débito emitida después de los dos meses desde la fecha de su factura (Ley del IVA art. 17). */
  'nota_de_debito_tardia',
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
  nota_de_debito: ['NDEB'],
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

/** Las familias que corrigen una factura: apuntan a ella con `documento_afectado_id`. */
export const TIPOS_DE_NOTA = ['nota_de_credito', 'nota_de_debito'] as const satisfies readonly TipoDeDocumento[];
export type TipoDeNota = (typeof TIPOS_DE_NOTA)[number];

/** `true` si la familia es una nota (de crédito o de débito) y por eso lleva la factura que corrige. */
export const esNota = (tipo: TipoDeDocumento): tipo is TipoDeNota =>
  (TIPOS_DE_NOTA as readonly string[]).includes(tipo);

/**
 * Las familias de factura a las que una nota (de débito o de crédito) sí corrige. No la factura especial, que emitió
 * la propia empresa y se anula y se registra de nuevo, ni el recibo ni otra nota.
 */
export const FAMILIAS_QUE_ADMITEN_NOTA_DE_DEBITO: readonly TipoDeDocumento[] = [
  'factura',
  'factura_pequeno_contribuyente',
  'factura_pequeno_contribuyente_electronico',
  'factura_contribuyente_agropecuario',
  'factura_primario_pecuario',
];
