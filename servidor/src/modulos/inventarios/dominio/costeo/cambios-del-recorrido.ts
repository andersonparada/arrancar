import { costoUnitarioDe } from './escalas.js';
import { esDeReparto, esDevolucion, type MovimientoDelKardex } from './movimientos-del-kardex.js';
import type { Capa, ResultadoDeMovimiento } from './tipos.js';

/** Lo que un recálculo cambia de un movimiento guardado. */
export interface CambioDeMovimiento {
  readonly id: string;
  readonly costoTotal: bigint;
  readonly costoUnitario: bigint;
  readonly saldoCantidad: bigint;
  readonly saldoValor: bigint;
  readonly montoAResultados: bigint;
}

const magnitud = (cantidad: bigint): bigint => (cantidad < 0n ? -cantidad : cantidad);

/**
 * Lo que el motor calcula: el costo de las salidas (también el de una devolución, al costo de su entrada), el
 * informativo de los traslados y lo absorbido de un reparto; lo demás (las entradas) se conserva.
 */
function costoRecalculado(m: MovimientoDelKardex, r: ResultadoDeMovimiento): { total: bigint; unitario: bigint } {
  if (esDeReparto(m)) return { total: r.costo, unitario: m.costoUnitario };
  const calculaElMetodo = (m.tipo === 'salida' && (m.costoDelMetodo || esDevolucion(m))) || m.tipo === 'traslado';
  if (!calculaElMetodo) return { total: m.costoTotal, unitario: m.costoUnitario };
  const total = m.cantidad < 0n ? -r.costo : r.costo;
  return { total, unitario: costoUnitarioDe(r.costo, magnitud(m.cantidad)) };
}

function cambioDe(m: MovimientoDelKardex, r: ResultadoDeMovimiento): CambioDeMovimiento {
  const costo = costoRecalculado(m, r);
  return {
    id: m.id,
    costoTotal: costo.total,
    costoUnitario: costo.unitario,
    saldoCantidad: r.saldoCantidad,
    saldoValor: r.saldoValor,
    montoAResultados: m.tipo === 'valor' || m.tipo === 'salida' ? r.aResultados : m.montoAResultados,
  };
}

const cambio = (m: MovimientoDelKardex, c: CambioDeMovimiento): boolean =>
  m.costoTotal !== c.costoTotal ||
  m.costoUnitario !== c.costoUnitario ||
  m.saldoCantidad !== c.saldoCantidad ||
  m.saldoValor !== c.saldoValor ||
  m.montoAResultados !== c.montoAResultados;

/**
 * Compara lo guardado con lo que el motor calculó y devuelve **solo** las filas que cambian (R-4: un recálculo largo
 * no reescribe lo que no se movió).
 */
export function cambiosDelRecorrido(
  guardados: readonly MovimientoDelKardex[],
  resultados: readonly ResultadoDeMovimiento[],
): CambioDeMovimiento[] {
  const porId = new Map(guardados.map((m) => [m.id, m]));
  const cambios: CambioDeMovimiento[] = [];
  for (const r of resultados) {
    const guardado = porId.get(r.id);
    if (!guardado) continue;
    const nuevo = cambioDe(guardado, r);
    if (cambio(guardado, nuevo)) cambios.push(nuevo);
  }
  return cambios;
}

/** Cómo queda el artículo en toda la empresa: lo que dice su último movimiento vigente (o cero si no tiene). */
export interface SaldoDelArticulo {
  readonly cantidad: bigint;
  readonly valor: bigint;
  readonly costoPromedio: bigint;
  readonly ultimoMovimientoId: string | null;
}

export function saldoDelRecorrido(resultados: readonly ResultadoDeMovimiento[]): SaldoDelArticulo {
  const ultimo = resultados.at(-1);
  if (!ultimo) return { cantidad: 0n, valor: 0n, costoPromedio: 0n, ultimoMovimientoId: null };
  const costoPromedio = ultimo.saldoCantidad > 0n ? costoUnitarioDe(ultimo.saldoValor, ultimo.saldoCantidad) : 0n;
  return {
    cantidad: ultimo.saldoCantidad,
    valor: ultimo.saldoValor,
    costoPromedio,
    ultimoMovimientoId: ultimo.id,
  };
}

/** Lo que queda de una entrada (PEPS), con lo que costó al entrar. */
export interface CapaDelRecorrido {
  readonly movimientoDeEntradaId: string;
  readonly fecha: string;
  readonly secuencia: number;
  readonly cantidadInicial: bigint;
  readonly valorInicial: bigint;
  readonly cantidadRestante: bigint;
  readonly valorRestante: bigint;
}

export interface ConsumoDelRecorrido {
  readonly movimientoDeSalidaId: string;
  readonly movimientoDeEntradaId: string;
  readonly cantidad: bigint;
  readonly valor: bigint;
}

function capaDelRecorrido(capa: Capa, valorInicial: bigint): CapaDelRecorrido {
  return {
    movimientoDeEntradaId: capa.id,
    fecha: capa.fecha,
    secuencia: capa.secuencia,
    cantidadInicial: capa.cantidadInicial,
    valorInicial,
    cantidadRestante: capa.cantidadRestante,
    valorRestante: capa.valorRestante,
  };
}

const consumosDe = (resultado: ResultadoDeMovimiento): ConsumoDelRecorrido[] =>
  resultado.consumos.map((c) => ({
    movimientoDeSalidaId: resultado.id,
    movimientoDeEntradaId: c.capaId,
    cantidad: c.cantidad,
    valor: c.valor,
  }));

/** Las capas finales y los consumos de cada salida, tal como los dejó el motor PEPS. */
export function capasDelRecorrido(
  guardados: readonly MovimientoDelKardex[],
  resultados: readonly ResultadoDeMovimiento[],
  capas: readonly Capa[],
): { capas: CapaDelRecorrido[]; consumos: ConsumoDelRecorrido[] } {
  const costoDeEntrada = new Map(guardados.map((m) => [m.id, m.costoTotal]));
  return {
    capas: capas.map((c) => capaDelRecorrido(c, costoDeEntrada.get(c.id) ?? 0n)),
    consumos: resultados.flatMap(consumosDe),
  };
}
