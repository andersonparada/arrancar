import type { Capa, PosicionEnKardex, TipoDeMovimiento } from './tipos.js';

const PESO_DEL_TIPO: Record<TipoDeMovimiento, number> = {
  entrada: 0,
  traslado_de_entrada: 0,
  valor: 1,
  salida: 2,
  traslado_de_salida: 2,
};

/** Compara por `(fecha, entradas antes que valores antes que salidas, secuencia)`. */
export function compararEnKardex(a: PosicionEnKardex, b: PosicionEnKardex): number {
  if (a.fecha !== b.fecha) return a.fecha < b.fecha ? -1 : 1;
  const porTipo = PESO_DEL_TIPO[a.tipo] - PESO_DEL_TIPO[b.tipo];
  return porTipo !== 0 ? porTipo : a.secuencia - b.secuencia;
}

/** Copia ordenada según el kardex (§7.2); no altera la original. */
export function ordenarKardex<T extends PosicionEnKardex>(movimientos: readonly T[]): T[] {
  return [...movimientos].sort(compararEnKardex);
}

/** Si el movimiento suma existencia a su bodega (entradas y mitad de destino del traslado). */
export function sumaExistencia(tipo: TipoDeMovimiento): boolean {
  return tipo === 'entrada' || tipo === 'traslado_de_entrada';
}

/** Las capas se consumen de la más antigua (`fecha`, `secuencia`). */
export function compararCapas(a: Capa, b: Capa): number {
  return compararEnKardex(
    { fecha: a.fecha, secuencia: a.secuencia, tipo: 'entrada' },
    { fecha: b.fecha, secuencia: b.secuencia, tipo: 'entrada' },
  );
}
