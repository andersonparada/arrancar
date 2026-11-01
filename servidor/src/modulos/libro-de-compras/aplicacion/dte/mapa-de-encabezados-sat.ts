import { comparable } from '../../../core/intercambio/aplicacion/ubicar-encabezados.js';

/** Cambia cuando se agregan o quitan variantes: queda en cada lote para saber con qué mapa se leyó. */
export const VERSION_DEL_MAPA = '2026-11-01';

export const CAMPOS_DEL_DTE = [
  'autorizacionFel',
  'tipoDte',
  'serie',
  'numero',
  'fechaEmision',
  'nitEmisor',
  'nombreEmisor',
  'nitReceptor',
  'moneda',
  'total',
  'iva',
  'idp',
  'estado',
  'marcaDeAnulado',
  'fechaDeAnulacion',
] as const;
export type CampoDelDte = (typeof CAMPOS_DEL_DTE)[number];

/** Sin estos no hay DTE que leer; el NIT del receptor, la moneda, el IDP y la anulación son opcionales. */
export const CAMPOS_OBLIGATORIOS: readonly CampoDelDte[] = [
  'autorizacionFel',
  'tipoDte',
  'serie',
  'numero',
  'fechaEmision',
  'nitEmisor',
  'nombreEmisor',
  'total',
  'iva',
];

/** Campo del DTE → títulos con que puede venir en el archivo de la SAT (se comparan sin tildes ni signos). */
export const ENCABEZADOS_DEL_DTE: Record<CampoDelDte, readonly string[]> = {
  autorizacionFel: ['Número de Autorización', 'Número de autorización', 'UUID', 'Autorización'],
  tipoDte: ['Tipo de DTE (nombre)', 'Tipo de DTE', 'Tipo DTE', 'Tipo de documento'],
  serie: ['Serie'],
  numero: ['Número del DTE', 'Número de DTE', 'Número'],
  fechaEmision: ['Fecha de emisión', 'Fecha emisión'],
  nitEmisor: ['NIT del emisor', 'NIT emisor'],
  nombreEmisor: ['Nombre completo del emisor', 'Nombre del emisor', 'Emisor'],
  nitReceptor: ['ID del receptor', 'NIT del receptor', 'NIT receptor'],
  moneda: ['Moneda'],
  total: ['Gran Total (Moneda Original)', 'Gran Total', 'Total'],
  iva: ['IVA (monto de este impuesto)', 'IVA'],
  idp: ['Petróleo (monto de este impuesto)', 'IDP (monto de este impuesto)', 'Petróleo', 'IDP'],
  estado: ['Estado'],
  marcaDeAnulado: ['Marca de anulado', 'Anulado'],
  fechaDeAnulacion: ['Fecha de anulación', 'Fecha anulación'],
};

const SUFIJO_DEL_IMPUESTO = ' (monto de este impuesto)';

/** Nombre corto con que se guarda cada otro impuesto, y cómo se llama su columna en la SAT (sin el sufijo). */
const NOMBRES_DE_OTROS_IMPUESTOS: Record<string, readonly string[]> = {
  'TURISMO HOSPEDAJE': ['Turismo Hospedaje', 'Impuesto de turismo hospedaje'],
  'TURISMO PASAJES': ['Turismo Pasajes', 'Impuesto de turismo pasajes'],
  'TIMBRE DE PRENSA': ['Timbre de Prensa'],
  BOMBEROS: ['Bomberos'],
  'TASA MUNICIPAL': ['Tasa Municipal'],
  'BEBIDAS ALCOHOLICAS': ['Bebidas alcohólicas'],
  TABACO: ['Tabaco'],
  CEMENTO: ['Cemento'],
  'BEBIDAS NO ALCOHOLICAS': ['Bebidas no Alcohólicas'],
  'TARIFA PORTUARIA': ['Tarifa Portuaria'],
};

/** Otro impuesto → títulos de su columna: con el sufijo de la SAT y sin él. */
export const OTROS_IMPUESTOS_DEL_DTE: Record<string, readonly string[]> = Object.fromEntries(
  Object.entries(NOMBRES_DE_OTROS_IMPUESTOS).map(([nombre, titulos]) => [
    nombre,
    titulos.flatMap((titulo) => [`${titulo}${SUFIJO_DEL_IMPUESTO}`, titulo]),
  ]),
);

/** Variantes agregadas por soporte (la variable de instalación): campo o impuesto → títulos. */
export type EncabezadosAdicionales = Record<string, readonly string[]>;

/** El mapa completo, con el del código más lo que soporte agregó. Las variantes del código nunca se quitan. */
export interface MapaDeEncabezados {
  campos: Record<CampoDelDte, readonly string[]>;
  impuestos: Record<string, readonly string[]>;
  /** Todos los títulos posibles, para buscar la fila de encabezados. */
  esperados: readonly string[];
}

function conAdicionales<Clave extends string>(
  base: Record<Clave, readonly string[]>,
  adicionales: EncabezadosAdicionales,
): Record<Clave, readonly string[]> {
  return Object.fromEntries(
    Object.entries<readonly string[]>(base).map(([clave, titulos]) => [
      clave,
      [...titulos, ...(adicionales[clave] ?? [])],
    ]),
  ) as unknown as Record<Clave, readonly string[]>;
}

export function construirMapa(adicionales: EncabezadosAdicionales = {}): MapaDeEncabezados {
  const campos = conAdicionales(ENCABEZADOS_DEL_DTE, adicionales);
  const impuestos = conAdicionales(OTROS_IMPUESTOS_DEL_DTE, adicionales);
  const esperados = [...Object.values(campos), ...Object.values(impuestos)].flat();
  return { campos, impuestos, esperados };
}

/** La posición de la primera columna cuyo título coincide con alguna variante, o `-1`. */
export function posicionDe(encabezados: readonly string[], variantes: readonly string[]): number {
  const buscadas = new Set(variantes.map(comparable));
  return encabezados.findIndex((titulo) => buscadas.has(comparable(titulo)));
}
