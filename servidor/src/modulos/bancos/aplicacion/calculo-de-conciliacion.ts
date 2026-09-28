/** Lo mínimo de un movimiento candidato que hace falta para el cálculo en vivo. */
export interface MovimientoParaConciliar {
  efectoEnCentavos: number;
  marcado: boolean;
}

/** Saldo conciliado = saldo anterior + el efecto de los movimientos marcados. */
export function calcularSaldoConciliado(
  saldoAnteriorEnCentavos: number,
  movimientos: readonly MovimientoParaConciliar[],
): number {
  return movimientos
    .filter((movimiento) => movimiento.marcado)
    .reduce((suma, movimiento) => suma + movimiento.efectoEnCentavos, saldoAnteriorEnCentavos);
}

/** Diferencia = saldo según el banco − saldo conciliado. */
export function calcularDiferencia(saldoSegunBancoEnCentavos: number, saldoConciliadoEnCentavos: number): number {
  return saldoSegunBancoEnCentavos - saldoConciliadoEnCentavos;
}
