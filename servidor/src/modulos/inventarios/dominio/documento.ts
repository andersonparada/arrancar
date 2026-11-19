/**
 * Las clases de documento que ya mueven el kardex. Las demás de `docs/modulos/diseno-inventarios.md` §3.6 (traslado,
 * ajuste…) se agregan con el paso que las trae, junto con el `check` de la base de datos.
 */
export const CLASES_DE_DOCUMENTO = [
  'entrada_manual',
  'salida_por_consumo',
  'recepcion_de_compra',
  'devolucion_a_proveedor',
  'rebaja_de_costo',
] as const;

export type ClaseDeDocumento = (typeof CLASES_DE_DOCUMENTO)[number];

/** Por qué entra mercadería sin pasar por el libro de compras (§6.4). */
export const CAUSAS_DE_ENTRADA = ['produccion_propia', 'donacion_recibida', 'aporte', 'otra'] as const;

export type CausaDeEntrada = (typeof CAUSAS_DE_ENTRADA)[number];

/** Para qué sale la mercadería (§3.7); los destinos de Activos fijos llegan con su integración. */
export const DESTINOS_DE_SALIDA = ['gasto', 'obra_de_activo_fijo', 'mantenimiento_de_activo_fijo'] as const;

export type DestinoDeSalida = (typeof DESTINOS_DE_SALIDA)[number];

export type EstadoDeDocumento = 'vigente' | 'anulado';

/** Lo que cada clase de documento hace con el kardex: entra, sale o solo ajusta el valor (la rebaja, sin cantidad). */
export const TIPO_DE_MOVIMIENTO_POR_CLASE = {
  entrada_manual: 'entrada',
  salida_por_consumo: 'salida',
  recepcion_de_compra: 'entrada',
  devolucion_a_proveedor: 'salida',
  rebaja_de_costo: 'valor',
} as const satisfies Record<ClaseDeDocumento, 'entrada' | 'salida' | 'valor'>;

/** Cómo se llama cada clase en los mensajes («Recepción 3»). */
export const NOMBRE_DE_CLASE: Record<ClaseDeDocumento, string> = {
  entrada_manual: 'Entrada',
  salida_por_consumo: 'Salida',
  recepcion_de_compra: 'Recepción',
  devolucion_a_proveedor: 'Devolución a proveedor',
  rebaja_de_costo: 'Rebaja de costo',
};

/** Las clases que nacen de una factura o nota del Libro de compras (llevan `documento_de_compra_id`). */
export const CLASES_DEL_LIBRO = ['recepcion_de_compra', 'devolucion_a_proveedor', 'rebaja_de_costo'] as const;

/** Las clases de solo valor no tienen bodega ni mueven existencias. */
export const esDeSoloValor = (clase: ClaseDeDocumento): boolean => TIPO_DE_MOVIMIENTO_POR_CLASE[clase] === 'valor';
