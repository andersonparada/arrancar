import { aCentavos, deCentavos } from '../comunes/centavos';
import type { TipoDeMovimiento } from '../conceptos/opciones-de-concepto';
import type { FilaDelReporte } from '../../servicios/movimientos.api';

/** Cuántos movimientos admite una sola clasificación en lote (el servidor rechaza más). */
export const MAXIMO_POR_LOTE = 200;

type Pendiente = Pick<FilaDelReporte, 'id' | 'tipo' | 'monto' | 'puedeReclasificar' | 'anuladoEn'>;

/** De lo que trajo el reporte, solo lo que se puede clasificar: sin inversos, transferencias ni saldo inicial. */
export function pendientesDeClasificar<Fila extends Pendiente>(filas: readonly Fila[]): Fila[] {
  return filas.filter((fila) => fila.puedeReclasificar && !fila.anuladoEn);
}

/**
 * Ordena por beneficiario (sin él, al final) y, dentro de cada uno, por fecha: así clasificar uno a mano ayuda a
 * sus vecinos, que quedan juntos y con su sugerencia recalculada.
 */
export function ordenadosPorBeneficiario<Fila extends { beneficiario: string | null; fecha: string }>(
  filas: readonly Fila[],
): Fila[] {
  const clave = (fila: Fila): string => (fila.beneficiario ?? '').trim();
  return [...filas].sort((a, b) => {
    if (!clave(a) !== !clave(b)) return clave(a) ? -1 : 1;
    return clave(a).localeCompare(clave(b), 'es', { sensitivity: 'base' }) || a.fecha.localeCompare(b.fecha);
  });
}

/** Marca o desmarca uno; con el tope de un lote lleno, no deja marcar otro (los ya marcados sí se pueden quitar). */
export function conAlternado(seleccion: ReadonlySet<string>, id: string): Set<string> {
  const copia = new Set(seleccion);
  if (copia.has(id)) copia.delete(id);
  else if (copia.size < MAXIMO_POR_LOTE) copia.add(id);
  return copia;
}

/** Si todo lo visible está marcado. */
export const todosMarcados = (filas: readonly Pendiente[], seleccion: ReadonlySet<string>): boolean =>
  filas.length > 0 && filas.every((fila) => seleccion.has(fila.id));

/** Marca todo lo visible (hasta el tope de un lote), o lo desmarca si ya estaba todo marcado. */
export function conTodosAlternados(filas: readonly Pendiente[], seleccion: ReadonlySet<string>): Set<string> {
  if (todosMarcados(filas, seleccion)) return new Set();
  return new Set(filas.slice(0, MAXIMO_POR_LOTE).map((fila) => fila.id));
}

/** Lo que sigue marcado después de recargar: solo lo que todavía está pendiente. */
export const marcasVigentes = (filas: readonly Pendiente[], seleccion: ReadonlySet<string>): Set<string> =>
  new Set(filas.filter((fila) => seleccion.has(fila.id)).map((fila) => fila.id));

export interface ResumenDeSeleccion {
  cantidad: number;
  montoDeEntradas: string;
  montoDeSalidas: string;
}

/** Cuántos hay marcados y cuánto dinero entra y sale entre ellos (en centavos enteros, no en decimales). */
export function resumenDeSeleccion(filas: readonly Pendiente[], seleccion: ReadonlySet<string>): ResumenDeSeleccion {
  const marcadas = filas.filter((fila) => seleccion.has(fila.id));
  const suma = (esEntrada: boolean) =>
    marcadas
      .filter((fila) => (fila.tipo === 'credito') === esEntrada)
      .reduce((total, fila) => total + aCentavos(fila.monto), 0);
  return {
    cantidad: marcadas.length,
    montoDeEntradas: deCentavos(suma(true)),
    montoDeSalidas: deCentavos(suma(false)),
  };
}

/** Los tipos distintos que hay entre lo marcado: de ellos depende qué conceptos se pueden ofrecer. */
export function tiposDeSeleccion(filas: readonly Pendiente[], seleccion: ReadonlySet<string>): TipoDeMovimiento[] {
  return [...new Set(filas.filter((fila) => seleccion.has(fila.id)).map((fila) => fila.tipo))];
}
