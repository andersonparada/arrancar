import type { Operador } from '../../../core/compartido/aplicacion/operador.js';

/**
 * Pregunta si el módulo Cuentas por pagar está activo en la cuenta (P3). Con él activo, los pagos a proveedores
 * los manda su módulo con su propio concepto y en Bancos no se eligen a mano.
 */
export interface CuentasPorPagarActivo {
  estaActivo(operador: Operador): Promise<boolean>;
}
