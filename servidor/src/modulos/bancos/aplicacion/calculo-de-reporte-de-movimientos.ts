import { deCentavos, efectoEnCentavos } from '../dominio/centavos.js';
import type { MovimientoDto } from './dto/movimiento.dto.js';

/** Una fila del reporte de movimientos, con su saldo corrido (`null` si el reporte no eligió una cuenta). */
export type FilaDelReporte = MovimientoDto & { saldo: string | null };

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
): FilaDelReporte[] {
  let saldoEnCentavos = saldoAnteriorEnCentavos;
  return movimientos.map((movimiento) => {
    if (!movimiento.anuladoEn) saldoEnCentavos += efectoEnCentavos(movimiento.tipo, movimiento.monto);
    return { ...movimiento, saldo: deCentavos(saldoEnCentavos) };
  });
}
