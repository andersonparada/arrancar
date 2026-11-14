import { etiquetaDe } from './documento-por-pagar.js';
import { SaldoInicialAutorizado, SaldoInicialConMovimientos } from './errores-de-saldos-iniciales.js';
import {
  noEstarEnContrasena,
  noTenerPagosVigentes,
  noTenerReintegrosVigentes,
  type ReglaDeBaja,
} from './reglas-de-baja.js';

/** La autorización aprobó un monto y no se cambia por debajo: primero se desautoriza. */
export const noEstarAutorizadoElSaldo: ReglaDeBaja = ({ documento }) => {
  if (documento.estado === 'autorizado') throw new SaldoInicialAutorizado(etiquetaDe(documento));
};

/**
 * Un saldo inicial con notas aplicadas (hechas o recibidas), con ajustes vigentes o con alguna nota que lo corrige
 * (también anulada: la apertura nunca cambia por una nota posterior) ya tiene movimientos.
 */
export const noTenerMovimientos: ReglaDeBaja = ({ documento, hechas, recibidas, ajustes, notasQueLoCorrigen }) => {
  const ajustado = ajustes.some(({ estado }) => estado === 'vigente');
  if (hechas.length > 0 || recibidas.length > 0 || ajustado || notasQueLoCorrigen > 0)
    throw new SaldoInicialConMovimientos(etiquetaDe(documento));
};

/**
 * Las reglas para corregir o eliminar un saldo inicial (Chain of Responsibility, como las reglas de baja). No estar en una contraseña vigente
 * va primero, y antes «no tiene pagos vigentes»: uno con pagos solo anulados sí se corrige o se elimina.
 */
export const REGLAS_PARA_CORREGIR_SALDO_INICIAL: readonly ReglaDeBaja[] = [
  noTenerPagosVigentes,
  noTenerReintegrosVigentes,
  noEstarEnContrasena,
  noEstarAutorizadoElSaldo,
  noTenerMovimientos,
];
