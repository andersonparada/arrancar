import { aCentavos, deCentavos, efectoEnCentavos } from '../dominio/centavos.js';
import type { MovimientoDto, ResumenDeSinClasificar } from './dto/movimiento.dto.js';
import type { MesDeConciliacionDto } from './dto/saldos-por-cuenta.dto.js';

/** Un movimiento con su saldo corrido (`null` si el reporte no eligió una cuenta). */
export type FilaConSaldo = MovimientoDto & { saldo: string | null };

/** Una fila del reporte de movimientos: además, el mes de la conciliación autorizada donde quedó marcada (si lo está). */
export type FilaDelReporte = FilaConSaldo & { conciliadoEn: MesDeConciliacionDto | null };

/** Agrega a cada fila el mes de su conciliación autorizada; una marca de una conciliación en proceso no cuenta. */
export const conMesConciliado = (
  filas: readonly FilaConSaldo[],
  meses: ReadonlyMap<string, MesDeConciliacionDto>,
): FilaDelReporte[] =>
  filas.map((fila) => ({ ...fila, conciliadoEn: (fila.conciliacionId && meses.get(fila.conciliacionId)) || null }));

/** El día anterior a `fecha` (`AAAA-MM-DD`), para calcular el saldo anterior al filtro `desde`. */
export function diaAnteriorA(fecha: string): string {
  const [anio = 0, mes = 1, dia = 1] = fecha.split('-').map(Number);
  const fechaUtc = new Date(Date.UTC(anio, mes - 1, dia));
  fechaUtc.setUTCDate(fechaUtc.getUTCDate() - 1);
  return fechaUtc.toISOString().slice(0, 10);
}

/**
 * El saldo corrido de los movimientos, ya en orden ascendente, a partir del saldo anterior.
 * Los anulados no mueven el saldo: quedan con el saldo que había antes de ellos.
 */
export function calcularSaldoCorrido(
  saldoAnteriorEnCentavos: number,
  movimientos: readonly MovimientoDto[],
): FilaConSaldo[] {
  let saldoEnCentavos = saldoAnteriorEnCentavos;
  return movimientos.map((movimiento) => {
    if (!movimiento.anuladoEn) saldoEnCentavos += efectoEnCentavos(movimiento.tipo, movimiento.monto);
    return { ...movimiento, saldo: deCentavos(saldoEnCentavos) };
  });
}

/** Cuenta y suma, en centavos enteros, lo que todavía no tiene concepto (ya filtrado: originales vigentes). */
export function resumirSinClasificar(pendientes: readonly MovimientoDto[]): ResumenDeSinClasificar {
  const suma = (esEntrada: boolean) =>
    pendientes
      .filter(({ tipo }) => (tipo === 'credito') === esEntrada)
      .reduce((total, { monto }) => total + aCentavos(monto), 0);
  return {
    cantidad: pendientes.length,
    montoDeEntradas: deCentavos(suma(true)),
    montoDeSalidas: deCentavos(suma(false)),
  };
}
