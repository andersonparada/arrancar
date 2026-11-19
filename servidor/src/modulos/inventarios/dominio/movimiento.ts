/** Como se guarda el tipo de un movimiento (§5.10); `traslado` es una mitad de un traslado, neutra para el costeo. */
export type TipoDeMovimientoGuardado = 'entrada' | 'salida' | 'valor' | 'traslado';

/** Dentro de un día: primero entra, luego los valores y al final sale (§7.2). */
export const ORDEN_DEL_DIA = { entrada: 0, valor: 1, salida: 2 } as const;
