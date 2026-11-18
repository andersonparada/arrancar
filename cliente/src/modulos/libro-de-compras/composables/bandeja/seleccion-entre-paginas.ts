import type { DteRecibido } from '../../servicios/dte-recibidos.api';
import { conLasMarcasDeLaLista } from './anteriores-a-la-fecha-de-inicio';

/** Lo marcado, con la fila completa: se conserva aunque se cambie de página o de filtro. */
export type FilasElegidas = ReadonlyMap<string, DteRecibido>;

/** Marca las filas (si ya estaban, quedan con la versión nueva). */
export function conMarcadas(elegidas: FilasElegidas, filas: readonly DteRecibido[]): FilasElegidas {
  const copia = new Map(elegidas);
  for (const fila of filas) copia.set(fila.id, fila);
  return copia;
}

/** Quita la marca de los ids dados. */
export function sinMarcadas(elegidas: FilasElegidas, ids: readonly string[]): FilasElegidas {
  const copia = new Map(elegidas);
  for (const id of ids) copia.delete(id);
  return copia;
}

/** Pone al día solo las filas que ya estaban marcadas con lo que llegó del servidor; no marca ninguna nueva. */
export function conLosDatosAlDia(elegidas: FilasElegidas, nuevas: readonly DteRecibido[]): FilasElegidas {
  const copia = new Map(elegidas);
  for (const nueva of nuevas) {
    const anterior = copia.get(nueva.id);
    if (anterior) copia.set(nueva.id, conLasMarcasDeLaLista(nueva, anterior));
  }
  return copia;
}

/** Todas las filas dadas están marcadas (y hay al menos una). */
export const estanTodasMarcadas = (elegidas: FilasElegidas, filas: readonly DteRecibido[]): boolean =>
  filas.length > 0 && filas.every(({ id }) => elegidas.has(id));

/** Si todas las filas dadas están marcadas las desmarca; si no, las marca todas. */
export const alternarFilas = (elegidas: FilasElegidas, filas: readonly DteRecibido[]): FilasElegidas =>
  estanTodasMarcadas(elegidas, filas)
    ? sinMarcadas(
        elegidas,
        filas.map(({ id }) => id),
      )
    : conMarcadas(elegidas, filas);

/** Cuántas de las filas dadas ya están marcadas. */
export const cuantasMarcadas = (elegidas: FilasElegidas, filas: readonly DteRecibido[]): number =>
  filas.filter(({ id }) => elegidas.has(id)).length;

/** Cuántas páginas hay que pedir para traer todas las filas de un filtro. */
export const paginasParaTraer = (total: number, porPagina: number): number => Math.ceil(total / porPagina);
