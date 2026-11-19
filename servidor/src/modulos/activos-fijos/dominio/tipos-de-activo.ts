/** Lo que se controla: un activo del balance, un bien de control (se fue a gasto) o un bien de terceros. */
export const TIPOS_DE_REGISTRO = ['activo', 'bien_de_control', 'de_terceros'] as const;
export type TipoDeRegistro = (typeof TIPOS_DE_REGISTRO)[number];

export const ORIGENES_DE_ACTIVO = [
  'compra',
  'construccion',
  'importacion',
  'aporte',
  'donacion',
  'saldo_inicial',
  'otro',
] as const;
export type OrigenDeActivo = (typeof ORIGENES_DE_ACTIVO)[number];

export const FORMAS_DE_TENENCIA = ['arrendamiento', 'comodato', 'otra'] as const;
export type FormaDeTenencia = (typeof FORMAS_DE_TENENCIA)[number];

/** Lo único que se guarda del ciclo de vida; «ocioso» es una bandera de `en_uso` y «depreciado» se deduce. */
export const ESTADOS_DE_ACTIVO = ['en_construccion', 'en_uso', 'dado_de_baja'] as const;
export type EstadoDeActivo = (typeof ESTADOS_DE_ACTIVO)[number];
