import { ExistenciaNegativa } from './errores.js';
import { proporcion } from './escalas.js';
import { ordenarKardex } from './orden.js';
import type { EstadoDePromedio, MovimientoDeCosto, Recorrido, ResultadoDeMovimiento } from './tipos.js';

/** Costo de una salida de `cantidad`: si vacía la existencia se lleva el residuo del redondeo (§7.1). */
export function costoDeSalidaPromedio(estado: EstadoDePromedio, cantidad: bigint): bigint {
  return cantidad === estado.cantidad ? estado.valor : proporcion(estado.valor, cantidad, estado.cantidad);
}

function aplicar(estado: EstadoDePromedio, m: MovimientoDeCosto): { estado: EstadoDePromedio; costo: bigint } {
  if (m.tipo === 'salida') {
    if (m.cantidad > estado.cantidad) throw new ExistenciaNegativa(m.fecha, m.cantidad - estado.cantidad, m.id);
    const costo = costoDeSalidaPromedio(estado, m.cantidad);
    return { estado: { cantidad: estado.cantidad - m.cantidad, valor: estado.valor - costo }, costo };
  }
  return { estado: { cantidad: estado.cantidad + m.cantidad, valor: estado.valor + m.valor }, costo: m.valor };
}

/**
 * Recorre en el orden del kardex los movimientos que siguen a `inicial` (el saldo del movimiento vigente
 * anterior, o cero) con promedio ponderado móvil. Lanza `ExistenciaNegativa` si en algún punto no alcanza.
 */
export function recalcularPromedio(
  movimientos: readonly MovimientoDeCosto[],
  inicial: EstadoDePromedio = { cantidad: 0n, valor: 0n },
): Recorrido<EstadoDePromedio> {
  let estado = inicial;
  const resultados: ResultadoDeMovimiento[] = [];
  for (const m of ordenarKardex(movimientos)) {
    const paso = aplicar(estado, m);
    estado = paso.estado;
    resultados.push({
      id: m.id,
      costo: paso.costo,
      saldoCantidad: estado.cantidad,
      saldoValor: estado.valor,
      consumos: [],
    });
  }
  return { resultados, estado };
}
