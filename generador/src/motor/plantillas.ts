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

/** Cambia cada `{{hueco}}` por su valor; si falta alguno, no deja la plantilla a medias. */
export function rellenar(plantilla: string, valores: Record<string, string>): string {
  const faltantes = [...plantilla.matchAll(HUECO)].map(([, hueco]) => hueco!).filter((hueco) => !(hueco in valores));
  if (faltantes.length > 0) throw new HuecoSinValor([...new Set(faltantes)]);
  return plantilla.replace(HUECO, (_, hueco: string) => valores[hueco]!);
}

/** Lee `plantillas/<ruta>.plantilla`: el código tal como se generará, con sus huecos. */
export const leerPlantilla = (ruta: string) => readFileSync(join(CARPETA_DE_PLANTILLAS, `${ruta}.plantilla`), 'utf8');
