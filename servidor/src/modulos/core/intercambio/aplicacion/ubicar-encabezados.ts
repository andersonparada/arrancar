import { normalizar } from './columnas.js';
import { EncabezadosNoEncontrados } from './errores-de-lectura.js';
import type { ArchivoDeFilas, FilaCruda } from './puertos/lector-de-filas.js';

/** Hasta qué fila se busca la de encabezados (los reportes traen títulos arriba). */
export const FILAS_DONDE_BUSCAR_ENCABEZADOS = 20;

type Ubicacion = Omit<ArchivoDeFilas, 'formato'>;

/** Para comparar: sin tildes, mayúsculas ni signos de puntuación. */
const comparable = (texto: string) =>
  normalizar(texto)
    .replace(/[.:#()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

function reconocidosEn(fila: FilaCruda, esperados: readonly string[]): string[] {
  const celdas = new Set(fila.celdas.map(comparable));
  return esperados.filter((nombre) => celdas.has(comparable(nombre)));
}

/** La fila con más encabezados esperados entre las primeras 20 (la primera si empatan). */
function mejorFila(filas: FilaCruda[], esperados: readonly string[]) {
  let mejor: { fila: FilaCruda; reconocidos: string[] } | undefined;
  for (const fila of filas.slice(0, FILAS_DONDE_BUSCAR_ENCABEZADOS)) {
    const reconocidos = reconocidosEn(fila, esperados);
    if (reconocidos.length > (mejor?.reconocidos.length ?? 0)) mejor = { fila, reconocidos };
  }
  return mejor;
}

/** Ubica la fila de encabezados y separa los reconocidos de los que no. */
export function ubicarEncabezados(filas: FilaCruda[], esperados: readonly string[]): Ubicacion {
  const mejor = mejorFila(filas, esperados);
  if (!mejor) throw new EncabezadosNoEncontrados(esperados);
  const conocidos = new Set(esperados.map(comparable));
  const { fila, reconocidos } = mejor;
  return {
    filaDeEncabezados: fila.numero,
    encabezados: fila.celdas,
    reconocidos,
    noReconocidos: fila.celdas.filter((celda) => celda !== '' && !conocidos.has(comparable(celda))),
    filas: filas.filter((otra) => otra.numero > fila.numero),
  };
}
