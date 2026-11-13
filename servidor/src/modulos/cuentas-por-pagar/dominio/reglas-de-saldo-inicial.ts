import { etiquetaDe } from './documento-por-pagar.js';
import { SaldoInicialAutorizado, SaldoInicialConMovimientos } from './errores-de-saldos-iniciales.js';
import type { ReglaDeBaja } from './reglas-de-baja.js';

/** La autorización aprobó un monto y no se cambia por debajo: primero se desautoriza. */
export const noEstarAutorizadoElSaldo: ReglaDeBaja = ({ documento }) => {
  if (documento.estado === 'autorizado') throw new SaldoInicialAutorizado(etiquetaDe(documento));
};

/** Un saldo inicial con notas aplicadas (hechas o recibidas) o con ajustes vigentes ya tiene movimientos. */
export const noTenerMovimientos: ReglaDeBaja = ({ documento, hechas, recibidas, ajustes }) => {
  const ajustado = ajustes.some(({ estado }) => estado === 'vigente');
  if (hechas.length > 0 || recibidas.length > 0 || ajustado)
    throw new SaldoInicialConMovimientos(etiquetaDe(documento));
};

/**
 * Las reglas para corregir o eliminar un saldo inicial (Chain of Responsibility, como las reglas de baja). CP3 sumará
 * «no está en una contraseña vigente» y CP4 «no tiene pagos».
 */
export const REGLAS_PARA_CORREGIR_SALDO_INICIAL: readonly ReglaDeBaja[] = [
  noEstarAutorizadoElSaldo,
  noTenerMovimientos,
];
