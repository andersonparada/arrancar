import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ErrorDelGenerador } from '../definicion/errores.js';

const CARPETA_DE_PLANTILLAS = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'plantillas');

const HUECO = /\{\{(\w+)\}\}/g;

export class HuecoSinValor extends ErrorDelGenerador {
  override readonly name = 'HuecoSinValor';

  constructor(huecos: string[]) {
    super(`A la plantilla le faltan valores para: ${huecos.join(', ')}.`);
  }
}

/** Algo que parece un hueco pero no lo es (`{{hacía}}`); las interpolaciones de Vue llevan espacios: `{{ valor }}`. */
const HUECO_MAL_ESCRITO = /\{\{(?!\s)[^}]*\}\}/g;

/** Cambia cada `{{hueco}}` por su valor; si falta alguno, no deja la plantilla a medias. */
export function rellenar(plantilla: string, valores: Record<string, string>): string {
  const faltantes = [...plantilla.matchAll(HUECO)].map(([, hueco]) => hueco!).filter((hueco) => !(hueco in valores));
  const malEscritos = [...plantilla.replace(HUECO, '').matchAll(HUECO_MAL_ESCRITO)].map(([hueco]) => hueco);
  if (faltantes.length + malEscritos.length > 0) throw new HuecoSinValor([...new Set([...faltantes, ...malEscritos])]);
  return plantilla.replace(HUECO, (_, hueco: string) => valores[hueco]!);
}

/** Lee `plantillas/<ruta>.plantilla`: el código tal como se generará, con sus huecos. */
export const leerPlantilla = (ruta: string) => readFileSync(join(CARPETA_DE_PLANTILLAS, `${ruta}.plantilla`), 'utf8');

const ENCABEZADO_DE_FRAGMENTO = /^### (\w+)\n/gm;

/**
 * Separa un archivo de fragmentos: cada `### nombre` abre un trozo de código que
 * va hasta el siguiente. Sirve para lo que cambia dentro de varios archivos (por
 * ejemplo, si el recurso se elimina o se inactiva) sin duplicar plantillas.
 */
/**
 * Los fragmentos de una variante (por ejemplo, la baja por inactivación), con
 * todos los nombres de la variante completa: los que la variante no trae quedan vacíos.
 */
export function fragmentosDeVariante(
  completa: string,
  variante: string,
  valores: Record<string, string>,
): Record<string, string> {
  const elegidos = separarFragmentos(variante);
  return Object.fromEntries(
    Object.keys(separarFragmentos(completa)).map((nombre) => [nombre, rellenar(elegidos[nombre] ?? '', valores)]),
  );
}

export function separarFragmentos(texto: string): Record<string, string> {
  const encabezados = [...texto.matchAll(ENCABEZADO_DE_FRAGMENTO)];
  return Object.fromEntries(
    encabezados.map((encabezado, i) => {
      const inicio = encabezado.index + encabezado[0].length;
      const fin = encabezados[i + 1]?.index ?? texto.length;
      return [encabezado[1]!, texto.slice(inicio, fin)];
    }),
  );
}
