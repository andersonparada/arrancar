import { etiquetaDe } from './documento-por-pagar.js';
import { SaldoInicialAutorizado, SaldoInicialConMovimientos } from './errores-de-saldos-iniciales.js';
import { noEstarEnContrasena, type ReglaDeBaja } from './reglas-de-baja.js';

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
 * Las reglas para corregir o eliminar un saldo inicial (Chain of Responsibility, como las reglas de baja). No estar en una contraseña vigente
 * va primero; CP4 sumará «no tiene pagos».
 */
export const REGLAS_PARA_CORREGIR_SALDO_INICIAL: readonly ReglaDeBaja[] = [
  noEstarEnContrasena,
  noEstarAutorizadoElSaldo,
  noTenerMovimientos,
];
