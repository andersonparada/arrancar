/** Las claves de módulo que reservan conceptos de Bancos y cómo se llaman ante el usuario. */
export const MODULO_CAJA_CHICA = 'caja-chica';
export const MODULO_CUENTAS_POR_LIQUIDAR = 'cuentas-por-liquidar';
/** Cuentas por pagar genera los pagos y marca las notas que aplica a facturas (CP4). */
export const MODULO_CUENTAS_POR_PAGAR = 'cuentas-por-pagar';

const NOMBRES_DE_MODULOS: Readonly<Record<string, string>> = {
  [MODULO_CAJA_CHICA]: 'Caja chica',
  [MODULO_CUENTAS_POR_LIQUIDAR]: 'Cuentas por liquidar',
  [MODULO_CUENTAS_POR_PAGAR]: 'Cuentas por pagar',
};

/** El nombre del módulo para mostrarlo; si no se conoce, su clave. */
export const nombreDelModulo = (modulo: string): string => NOMBRES_DE_MODULOS[modulo] ?? modulo;

/**
 * Concepto de sistema → módulo que lo registra (generaliza P3). Un concepto reservado se elige a mano en un cheque
 * o una nota solo si su módulo no está activo; los movimientos que ya lo tienen no cambian.
 */
export const CONCEPTOS_RESERVADOS_POR_MODULO: Readonly<Record<string, string>> = {
  pago_a_proveedor: MODULO_CUENTAS_POR_PAGAR,
  fondo_de_caja_chica: MODULO_CAJA_CHICA,
  devolucion_de_fondo_de_caja_chica: MODULO_CAJA_CHICA,
  reintegro_de_caja_chica: MODULO_CAJA_CHICA,
  reintegro_de_caja_chica_de_activo: MODULO_CAJA_CHICA,
  anticipo_por_liquidar: MODULO_CUENTAS_POR_LIQUIDAR,
  gasto_de_anticipo: MODULO_CUENTAS_POR_LIQUIDAR,
  gasto_de_anticipo_de_activo: MODULO_CUENTAS_POR_LIQUIDAR,
  anticipo_no_liquidado: MODULO_CUENTAS_POR_LIQUIDAR,
  devolucion_de_anticipo: MODULO_CUENTAS_POR_LIQUIDAR,
};
