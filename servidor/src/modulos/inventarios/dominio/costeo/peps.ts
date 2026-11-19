import { CapaNoDisponible, ExistenciaNegativa } from './errores.js';
import { costoUnitarioDe, proporcion, valorDe } from './escalas.js';
import { absorberConFactor } from './absorcion.js';
import { consumirParaDevolucion } from './devolucion-peps.js';
import { compararCapas, ordenarKardex } from './orden.js';
import type { Capa, ConsumoDeCapa, MovimientoDeCosto, Recorrido, ResultadoDeMovimiento } from './tipos.js';

/** Saldo del artículo: suma de lo que queda en las capas. */
export function saldoDeCapas(capas: readonly Capa[]): { cantidad: bigint; valor: bigint } {
  return capas.reduce(
    (suma, c) => ({ cantidad: suma.cantidad + c.cantidadRestante, valor: suma.valor + c.valorRestante }),
    { cantidad: 0n, valor: 0n },
  );
}

function consumir(capa: Capa, cantidad: bigint): ConsumoDeCapa {
  const agota = cantidad === capa.cantidadRestante;
  const valor = agota ? capa.valorRestante : proporcion(capa.valorRestante, cantidad, capa.cantidadRestante);
  return { capaId: capa.id, cantidad, valor };
}

/** Toma `cantidad` de las capas más antiguas con existencia (§7.4). */
export function consumirCapas(
  capas: readonly Capa[],
  cantidad: bigint,
  movimiento: Pick<MovimientoDeCosto, 'id' | 'fecha'>,
): { capas: Capa[]; consumos: ConsumoDeCapa[] } {
  let pendiente = cantidad;
  const consumos: ConsumoDeCapa[] = [];
  const nuevas = [...capas].sort(compararCapas).map((capa) => {
    if (pendiente === 0n || capa.cantidadRestante === 0n) return capa;
    const consumo = consumir(capa, pendiente < capa.cantidadRestante ? pendiente : capa.cantidadRestante);
    pendiente -= consumo.cantidad;
    consumos.push(consumo);
    return {
      ...capa,
      cantidadRestante: capa.cantidadRestante - consumo.cantidad,
      valorRestante: capa.valorRestante - consumo.valor,
    };
  });
  if (pendiente > 0n) throw new ExistenciaNegativa(movimiento.fecha, pendiente, { movimientoId: movimiento.id });
  return { capas: nuevas, consumos };
}

function sumarValor(capas: readonly Capa[], m: MovimientoDeCosto): Capa[] {
  const capa = capas.find((c) => c.id === m.capaId);
  if (!capa) throw new CapaNoDisponible(m.capaId);
  // Capa ya agotada por una salida anterior en el recálculo: lo que no tiene existencia va a resultados (§7.5).
  if (capa.cantidadRestante === 0n) return [...capas];
  return capas.map((c) => (c === capa ? { ...c, valorRestante: c.valorRestante + m.valor } : c));
}

function capaNueva(m: MovimientoDeCosto): Capa {
  return {
    id: m.id,
    fecha: m.fecha,
    secuencia: m.secuencia,
    cantidadInicial: m.cantidad,
    cantidadRestante: m.cantidad,
    valorRestante: m.valor,
  };
}

interface PasoPeps {
  readonly capas: Capa[];
  readonly costo: bigint;
  readonly consumos: ConsumoDeCapa[];
  readonly aResultados: bigint;
}

/** Reparto: absorbe lo que queda de la capa en esta posición, `cantidad restante / cantidad inicial` (§7.5). */
function repartir(capas: readonly Capa[], m: MovimientoDeCosto): PasoPeps {
  const entradaId = m.reparto?.entradaId;
  const capa = capas.find((c) => c.id === entradaId);
  if (!capa || !m.reparto) throw new CapaNoDisponible(entradaId);
  const factor = { numerador: capa.cantidadRestante, denominador: capa.cantidadInicial };
  const a = absorberConFactor(m.reparto.parte, factor, capa.valorRestante);
  const nuevas = capas.map((c) => (c === capa ? { ...c, valorRestante: c.valorRestante + a.absorbido } : c));
  return { capas: nuevas, costo: a.absorbido, consumos: [], aResultados: a.aResultados };
}

function ajustarValor(capas: readonly Capa[], m: MovimientoDeCosto): PasoPeps {
  if (m.reparto) return repartir(capas, m);
  return { capas: sumarValor(capas, m), costo: m.valor, consumos: [], aResultados: 0n };
}

function sacar(capas: readonly Capa[], m: MovimientoDeCosto): PasoPeps {
  if (m.devolucion) return consumirParaDevolucion(capas, m);
  const salida = consumirCapas(capas, m.cantidad, m);
  const costo = salida.consumos.reduce((suma, c) => suma + c.valor, 0n);
  return { capas: salida.capas, costo, consumos: salida.consumos, aResultados: 0n };
}

/** Un traslado no toca las capas: su costo es informativo, el costo unitario vigente de la empresa. */
function trasladar(capas: readonly Capa[], m: MovimientoDeCosto): PasoPeps {
  const saldo = saldoDeCapas(capas);
  const costo = saldo.cantidad > 0n ? valorDe(costoUnitarioDe(saldo.valor, saldo.cantidad), m.cantidad) : 0n;
  return { capas: [...capas], costo, consumos: [], aResultados: 0n };
}

function aplicar(capas: readonly Capa[], m: MovimientoDeCosto): PasoPeps {
  if (m.tipo === 'entrada') {
    return { capas: [...capas, capaNueva(m)], costo: m.valor, consumos: [], aResultados: 0n };
  }
  if (m.tipo === 'valor') return ajustarValor(capas, m);
  if (m.tipo === 'salida') return sacar(capas, m);
  return trasladar(capas, m);
}

/**
 * Recorre en el orden del kardex los movimientos que siguen a `inicial` (las capas tal como estaban antes
 * del primero: así se «deshacen» los consumos al recalcular). Lanza `ExistenciaNegativa` si no alcanza.
 */
export function recalcularPeps(
  movimientos: readonly MovimientoDeCosto[],
  inicial: readonly Capa[] = [],
): Recorrido<Capa[]> {
  let capas: Capa[] = [...inicial];
  const resultados: ResultadoDeMovimiento[] = [];
  for (const m of ordenarKardex(movimientos)) {
    const paso = aplicar(capas, m);
    capas = paso.capas;
    const saldo = saldoDeCapas(capas);
    resultados.push({
      id: m.id,
      costo: paso.costo,
      aResultados: paso.aResultados,
      saldoCantidad: saldo.cantidad,
      saldoValor: saldo.valor,
      consumos: paso.consumos,
    });
  }
  return { resultados, estado: capas };
}
