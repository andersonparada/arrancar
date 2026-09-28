import type { MovimientoConMarca } from '../../servicios/conciliaciones.api';

/**
 * El dinero viaja como texto (`"1250.50"`) y se calcula en centavos enteros: en
 * punto flotante, 0.1 + 0.2 no da 0.3 y los saldos se descuadran. Réplica, en el
 * cliente, de `servidor/src/modulos/bancos/dominio/centavos.ts`.
 */
export function aCentavos(monto: string): number {
  const limpio = monto.trim();
  const [enteros = '0', decimales = ''] = limpio.replace(/^-/, '').split('.');
  const centavos = Number(enteros) * 100 + Number(decimales.padEnd(2, '0').slice(0, 2));
  return limpio.startsWith('-') ? -centavos : centavos;
}

/** Centavos enteros como texto con dos decimales: `-15050` → `"-150.50"`. */
export function deCentavos(centavos: number): string {
  const signo = centavos < 0 ? '-' : '';
  const absoluto = Math.abs(centavos);
  return `${signo}${Math.trunc(absoluto / 100)}.${String(absoluto % 100).padStart(2, '0')}`;
}

/** Cuánto mueve el saldo un movimiento, en centavos: positivo si entra (crédito), negativo si sale. */
export function efectoEnCentavos(movimiento: Pick<MovimientoConMarca, 'tipo' | 'monto'>): number {
  const centavos = aCentavos(movimiento.monto);
  return movimiento.tipo === 'credito' ? centavos : -centavos;
}

export interface ResumenDeConciliacion {
  saldoConciliado: string;
  diferencia: string;
}

/**
 * El cálculo en vivo de la pantalla de conciliar: saldo conciliado = saldo
 * anterior + el efecto de los movimientos marcados; diferencia = saldo según
 * el banco − saldo conciliado.
 */
export function calcularResumen(
  saldoAnterior: string,
  saldoSegunBanco: string,
  movimientos: readonly MovimientoConMarca[],
): ResumenDeConciliacion {
  const saldoConciliadoEnCentavos = movimientos
    .filter((movimiento) => movimiento.marcado)
    .reduce((suma, movimiento) => suma + efectoEnCentavos(movimiento), aCentavos(saldoAnterior));
  const diferenciaEnCentavos = aCentavos(saldoSegunBanco) - saldoConciliadoEnCentavos;
  return { saldoConciliado: deCentavos(saldoConciliadoEnCentavos), diferencia: deCentavos(diferenciaEnCentavos) };
}
