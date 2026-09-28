import { leerCelda } from './celdas.js';
import { normalizar, type Columna, type OpcionDeReferencia } from './columnas.js';
import type { FilaLeida } from './puertos/libro-de-excel.js';

/** Un problema de una fila; sin columna, es de la fila entera (por ejemplo, un dato repetido). */
export interface ErrorDeImportacion {
  fila: number;
  columna: string | null;
  mensaje: string;
}

/** Lo que dice el esquema de la solicitud: los datos ya limpios o qué campos están mal. */
export type Validacion<Solicitud> = { datos: Solicitud } | { errores: { campo: string; mensaje: string }[] };

export type Validador<Solicitud> = (datos: Record<string, unknown>) => Validacion<Solicitud>;

/** Dónde está cada columna del recurso en el Excel, y las opciones de sus referencias. */
export interface ColumnasUbicadas {
  posiciones: Map<Columna, number>;
  opciones: Map<Columna, OpcionDeReferencia[]>;
}

/** Busca cada columna por su encabezado; las del Excel que no son del recurso se ignoran. */
export function ubicarColumnas(columnas: Columna[], encabezados: string[]) {
  const porTitulo = encabezados.map(normalizar);
  const posiciones = new Map<Columna, number>();
  for (const columna of columnas) {
    const posicion = porTitulo.indexOf(normalizar(columna.titulo));
    if (posicion >= 0) posiciones.set(columna, posicion);
  }
  const faltantes = columnas.filter((columna) => columna.requerido && !posiciones.has(columna));
  return { posiciones, faltantes };
}

/** Las opciones de cada referencia, una consulta por columna para todo el archivo. */
export async function consultarOpciones(columnas: Iterable<Columna>): Promise<Map<Columna, OpcionDeReferencia[]>> {
  const opciones = new Map<Columna, OpcionDeReferencia[]>();
  for (const columna of columnas) {
    if (columna.tipo === 'referencia') opciones.set(columna, await columna.opciones());
  }
  return opciones;
}

/** Los datos de una fila según sus columnas, o los problemas de sus celdas. */
export function leerFila(fila: FilaLeida, { posiciones, opciones }: ColumnasUbicadas) {
  const datos: Record<string, unknown> = {};
  const errores: ErrorDeImportacion[] = [];
  for (const [columna, posicion] of posiciones) {
    const lectura = leerCelda(fila.celdas[posicion], columna, opciones.get(columna));
    if ('error' in lectura) errores.push({ fila: fila.numero, columna: columna.titulo, mensaje: lectura.error });
    else datos[columna.clave] = lectura.valor;
  }
  return { datos, errores };
}

/** Los errores del esquema, con el encabezado de su columna en vez del nombre del campo. */
export function erroresDelEsquema(
  numero: number,
  errores: { campo: string; mensaje: string }[],
  columnas: Columna[],
): ErrorDeImportacion[] {
  return errores.map(({ campo, mensaje }) => ({
    fila: numero,
    columna: columnas.find((columna) => columna.clave === campo)?.titulo ?? null,
    mensaje,
  }));
}
