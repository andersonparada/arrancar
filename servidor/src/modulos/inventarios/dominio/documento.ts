/**
 * Las clases de documento que ya mueven el kardex. Las demás de `docs/modulos/diseno-inventarios.md` §3.6 (recepción,
 * traslado, ajuste…) se agregan con el paso que las trae, junto con el `check` de la base de datos.
 */
export const CLASES_DE_DOCUMENTO = ['entrada_manual', 'salida_por_consumo'] as const;

export type ClaseDeDocumento = (typeof CLASES_DE_DOCUMENTO)[number];

/** Por qué entra mercadería sin pasar por el libro de compras (§6.4). */
export const CAUSAS_DE_ENTRADA = ['produccion_propia', 'donacion_recibida', 'aporte', 'otra'] as const;

export type CausaDeEntrada = (typeof CAUSAS_DE_ENTRADA)[number];

/** Para qué sale la mercadería (§3.7); los destinos de Activos fijos llegan con su integración. */
export const DESTINOS_DE_SALIDA = ['gasto', 'obra_de_activo_fijo', 'mantenimiento_de_activo_fijo'] as const;

export type DestinoDeSalida = (typeof DESTINOS_DE_SALIDA)[number];

export type EstadoDeDocumento = 'vigente' | 'anulado';

/** Lo que cada clase de documento hace con las existencias. */
export const TIPO_DE_MOVIMIENTO_POR_CLASE = {
  entrada_manual: 'entrada',
  salida_por_consumo: 'salida',
} as const satisfies Record<ClaseDeDocumento, 'entrada' | 'salida'>;
