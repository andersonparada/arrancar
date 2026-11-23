/** Las claves de módulo que reservan conceptos de Bancos y cómo se llaman ante el usuario. */
export const MODULO_CAJA_CHICA = 'caja-chica';
export const MODULO_CUENTAS_POR_LIQUIDAR = 'cuentas-por-liquidar';
/** Cuentas por pagar genera los pagos y marca las notas que aplica a facturas (CP4). */
export const MODULO_CUENTAS_POR_PAGAR = 'cuentas-por-pagar';

/** Cuentas por cobrar genera los cobros y marca las notas de crédito que aplica a facturas (VC-0b). */
export const MODULO_CUENTAS_POR_COBRAR = 'cuentas-por-cobrar';

const NOMBRES_DE_MODULOS: Readonly<Record<string, string>> = {
  [MODULO_CAJA_CHICA]: 'Caja chica',
  [MODULO_CUENTAS_POR_LIQUIDAR]: 'Cuentas por liquidar',
  [MODULO_CUENTAS_POR_PAGAR]: 'Cuentas por pagar',
  [MODULO_CUENTAS_POR_COBRAR]: 'Cuentas por cobrar',
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
  cobro_a_cliente: MODULO_CUENTAS_POR_COBRAR,
  cobro_a_cliente_de_activo: MODULO_CUENTAS_POR_COBRAR,
  devolucion_a_cliente: MODULO_CUENTAS_POR_COBRAR,
  cheque_rechazado: MODULO_CUENTAS_POR_COBRAR,
};

/** Lo que marca un concepto: el módulo y la dirección de la nota suelta que lo lleva (la marca solo vale en esa dirección). */
export interface MarcaDeConcepto {
  modulo: string;
  tipoDeNota: 'credito' | 'debito';
}

/**
 * Concepto de sistema → marca de una **nota suelta** con ese concepto (VC-0b): la marca es el concepto mismo, sin
 * columna aparte, y solo cuenta en el tipo de nota indicado. El módulo puede ligar la nota a sus documentos.
 */
export const CONCEPTO_QUE_MARCA_PARA_MODULO: Readonly<Record<string, MarcaDeConcepto>> = {
  pago_a_proveedor: { modulo: MODULO_CUENTAS_POR_PAGAR, tipoDeNota: 'debito' },
  cobro_a_cliente: { modulo: MODULO_CUENTAS_POR_COBRAR, tipoDeNota: 'credito' },
};

/** El módulo para el que marca ese concepto en una nota de ese tipo; nulo si no marca para ninguno. */
export const moduloQueMarca = (claveDeSistema: string | null, tipoDeNota: string): string | null => {
  const marca = claveDeSistema !== null ? CONCEPTO_QUE_MARCA_PARA_MODULO[claveDeSistema] : undefined;
  return marca !== undefined && marca.tipoDeNota === tipoDeNota ? marca.modulo : null;
};
