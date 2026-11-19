import { CapaNoDisponible, ExistenciaNegativa } from './errores.js';
import { valorDe } from './escalas.js';
import { compararCapas } from './orden.js';
import type { Capa, ConsumoDeCapa, MovimientoDeCosto } from './tipos.js';

export interface SalidaPorDevolucion {
  readonly capas: Capa[];
  readonly consumos: ConsumoDeCapa[];
  readonly costo: bigint;
  /** Valor que quedó en capas sin existencia: sale del artículo y va a resultados (VC-1). */
  readonly aResultados: bigint;
}

function tomar(capa: Capa, pedido: bigint, costoUnitario: bigint) {
  const cantidad = pedido < capa.cantidadRestante ? pedido : capa.cantidadRestante;
  const aCosto = valorDe(costoUnitario, cantidad);
  const valor = aCosto < capa.valorRestante ? aCosto : capa.valorRestante;
  const agota = cantidad === capa.cantidadRestante;
  const residuo = agota ? capa.valorRestante - valor : 0n;
  const nueva = {
    ...capa,
    cantidadRestante: capa.cantidadRestante - cantidad,
    valorRestante: agota ? 0n : capa.valorRestante - valor,
  };
  return { nueva, consumo: { capaId: capa.id, cantidad, valor }, residuo };
}

/**
 * Devolución a proveedor con PEPS (§7.4): rebaja **su propia capa** y, si no alcanza, lo que falta sale de las
 * capas siguientes, todo al costo unitario de la entrada devuelta. No toca la capa más antigua por defecto.
 */
export function consumirParaDevolucion(capas: readonly Capa[], m: MovimientoDeCosto): SalidaPorDevolucion {
  if (!m.devolucion) throw new CapaNoDisponible(undefined);
  const propia = capas.find((c) => c.id === m.devolucion?.entradaId);
  if (!propia) throw new CapaNoDisponible(m.devolucion.entradaId);
  const orden = [propia, ...[...capas].sort(compararCapas).filter((c) => c !== propia)];
  const cambios = new Map<string, Capa>();
  const consumos: ConsumoDeCapa[] = [];
  let pendiente = m.cantidad;
  let residuos = 0n;
  for (const capa of orden) {
    if (pendiente === 0n) break;
    if (capa.cantidadRestante === 0n) continue;
    const paso = tomar(capa, pendiente, m.devolucion.costoUnitario);
    cambios.set(capa.id, paso.nueva);
    consumos.push(paso.consumo);
    pendiente -= paso.consumo.cantidad;
    residuos += paso.residuo;
  }
  if (pendiente > 0n) throw new ExistenciaNegativa(m.fecha, pendiente, m.id);
  const costo = consumos.reduce((suma, c) => suma + c.valor, 0n);
  return { capas: capas.map((c) => cambios.get(c.id) ?? c), consumos, costo, aResultados: residuos };
}
