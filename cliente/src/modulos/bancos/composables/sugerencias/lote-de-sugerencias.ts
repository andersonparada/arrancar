import { aCentavos, deCentavos } from '../comunes/centavos';
import { MAXIMO_POR_LOTE } from '../movimientos/seleccion-de-pendientes';
import type { OpcionSugerida, RespuestaDeSugerencias, SugerenciaDeMovimiento } from '../../servicios/sugerencias.api';

type FilaDeLote = { id: string; tipo: 'credito' | 'debito' | 'cheque'; monto: string };

/** Las sugerencias de la bandeja por id de movimiento. */
export type SugerenciasPorMovimiento = ReadonlyMap<string, SugerenciaDeMovimiento>;

/** Un concepto del lote con cuánto se clasifica en él. */
export interface GrupoDeLote {
  conceptoId: string;
  conceptoNombre: string;
  cantidad: number;
  montoDeEntradas: string;
  montoDeSalidas: string;
}

/** Lo que se mandaría al aceptar lo sugerido de lo marcado. */
export interface LoteDeSugerencias {
  asignaciones: { movimientoId: string; conceptoId: string }[];
  grupos: GrupoDeLote[];
  /** Marcados que no tienen sugerido y por eso no entran al lote. */
  sinSugerencia: number;
}

/** Indexa la respuesta del servidor por movimiento (los que no traen id se ignoran). */
export function indexarSugerencias(
  respuesta: Pick<RespuestaDeSugerencias, 'sugerencias'>,
): Map<string, SugerenciaDeMovimiento> {
  const mapa = new Map<string, SugerenciaDeMovimiento>();
  for (const sugerencia of respuesta.sugerencias) {
    if (sugerencia.movimientoId) mapa.set(sugerencia.movimientoId, sugerencia);
  }
  return mapa;
}

/** Solo las filas que tienen un concepto sugerido (el filtro «Solo con sugerencia»). */
export const conSugerido = <Fila extends { id: string }>(
  filas: readonly Fila[],
  sugerencias: SugerenciasPorMovimiento,
): Fila[] => filas.filter((fila) => sugerencias.get(fila.id)?.sugerido);

/** Cuántos de lo marcado tienen sugerido (lo que dice el botón «Aceptar lo sugerido»). */
export const cantidadConSugerido = (
  filas: readonly FilaDeLote[],
  seleccion: ReadonlySet<string>,
  sugerencias: SugerenciasPorMovimiento,
): number =>
  conSugerido(
    filas.filter((fila) => seleccion.has(fila.id)),
    sugerencias,
  ).length;

type Acumulado = { nombre: string; cantidad: number; entradas: number; salidas: number };

function sumar(acumulados: Map<string, Acumulado>, opcion: OpcionSugerida, fila: FilaDeLote): void {
  const { conceptoId, conceptoNombre: nombre } = opcion;
  const previo = acumulados.get(conceptoId) ?? { nombre, cantidad: 0, entradas: 0, salidas: 0 };
  const centavos = aCentavos(fila.monto);
  acumulados.set(conceptoId, {
    nombre,
    cantidad: previo.cantidad + 1,
    entradas: previo.entradas + (fila.tipo === 'credito' ? centavos : 0),
    salidas: previo.salidas + (fila.tipo === 'credito' ? 0 : centavos),
  });
}

/**
 * Agrupa por concepto lo marcado que tiene sugerido (hasta el tope de un lote, en el orden de la lista), para la
 * ventana de confirmación. Lo marcado sin sugerido no entra y se cuenta aparte.
 */
export function loteDeSugerencias(
  filas: readonly FilaDeLote[],
  seleccion: ReadonlySet<string>,
  sugerencias: SugerenciasPorMovimiento,
): LoteDeSugerencias {
  const marcadas = filas.filter((fila) => seleccion.has(fila.id));
  const elegibles = conSugerido(marcadas, sugerencias).slice(0, MAXIMO_POR_LOTE);
  const acumulados = new Map<string, Acumulado>();
  const asignaciones = elegibles.map((fila) => {
    const opcion = sugerencias.get(fila.id)!.sugerido!;
    sumar(acumulados, opcion, fila);
    return { movimientoId: fila.id, conceptoId: opcion.conceptoId };
  });
  const grupos = [...acumulados.entries()]
    .map(([conceptoId, a]) => ({
      conceptoId,
      conceptoNombre: a.nombre,
      cantidad: a.cantidad,
      montoDeEntradas: deCentavos(a.entradas),
      montoDeSalidas: deCentavos(a.salidas),
    }))
    .sort((a, b) => a.conceptoNombre.localeCompare(b.conceptoNombre, 'es'));
  return { asignaciones, grupos, sinSugerencia: marcadas.length - elegibles.length };
}
