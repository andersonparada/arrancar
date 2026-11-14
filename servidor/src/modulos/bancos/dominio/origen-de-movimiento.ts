/** De dónde viene un movimiento que generó otro módulo (P6): su clave y el id del documento. */
export interface OrigenDeMovimiento {
  modulo: string;
  documentoId: string;
}

/** La clave de Cuentas por pagar: genera los pagos y marca las notas que aplica a facturas (CP4). */
export const MODULO_CUENTAS_POR_PAGAR = 'cuentas-por-pagar';
