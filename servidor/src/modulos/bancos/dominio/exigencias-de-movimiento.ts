import { NoEsUnaNota, NoEsUnSaldoInicial } from './errores.js';
import { NotaNoMarcable } from './errores-de-origen.js';
import type { PropiedadesDeMovimiento } from './propiedades-de-movimiento.js';

/**
 * Exige que sea una nota suelta y vigente de alguno de esos tipos: sin origen, sin transferencia, sin ser saldo inicial
 * ni inverso, y sin estar anulada ni revertida.
 * @throws NotaNoMarcable si no lo es.
 */
export function exigirNotaMarcable(
  movimiento: Readonly<PropiedadesDeMovimiento>,
  tipos: readonly PropiedadesDeMovimiento['tipo'][],
): void {
  const { tipo, saldoInicial, transferenciaId, moduloDeOrigen, revierteAId, anuladoEn, revertidoEn } = movimiento;
  const suelta = tipos.includes(tipo) && !saldoInicial && transferenciaId === null && moduloDeOrigen === null;
  if (!suelta || revierteAId !== null || anuladoEn !== null || revertidoEn !== null) throw new NotaNoMarcable();
}

/**
 * Exige que el movimiento sea de la clase que espera quien lo pide (nota o saldo inicial).
 * @throws NoEsUnaNota si se esperaba una nota y es el saldo inicial; NoEsUnSaldoInicial si es al revés.
 */
export function exigirClaseDeMovimiento(movimiento: Readonly<PropiedadesDeMovimiento>, esSaldoInicial: boolean): void {
  const { saldoInicial, parteDeApertura } = movimiento;
  if (saldoInicial && !esSaldoInicial) throw new NoEsUnaNota();
  if (!saldoInicial && esSaldoInicial) throw new NoEsUnSaldoInicial();
  if (esSaldoInicial && parteDeApertura !== null && parteDeApertura !== 'saldo_global') throw new NoEsUnSaldoInicial();
}
