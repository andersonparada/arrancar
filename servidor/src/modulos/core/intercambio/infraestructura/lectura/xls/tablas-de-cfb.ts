import { ArchivoNoLegible } from '../../../aplicacion/errores.js';
import { FIN_DE_CADENA, SECTOR_LIBRE, type SectoresDeCfb } from './cabecera-de-cfb.js';

/** Los enteros de 32 bits (little endian) de unos bytes. */
export function enteros(bytes: Buffer): Uint32Array {
  return Uint32Array.from({ length: Math.floor(bytes.length / 4) }, (_, i) => bytes.readUInt32LE(i * 4));
}

/** Los sectores de la FAT: los de la cabecera y los que sigue la cadena de sectores de la DIFAT. */
function sectoresDeLaFat(sectores: SectoresDeCfb): number[] {
  const { cabecera } = sectores;
  const ids = [...cabecera.difatDeLaCabecera];
  const visitados = new Set<number>();
  let actual = cabecera.primerSectorDeDifat;
  for (let i = 0; i < cabecera.sectoresDeDifat && ids.length < cabecera.sectoresDeFat; i++) {
    if (visitados.has(actual)) throw new ArchivoNoLegible();
    visitados.add(actual);
    const sector = sectores.sector(actual);
    const entradas = cabecera.tamanoDeSector / 4 - 1;
    for (let j = 0; j < entradas; j++) ids.push(sector.readUInt32LE(j * 4));
    actual = sector.readUInt32LE(entradas * 4);
  }
  return ids.slice(0, cabecera.sectoresDeFat);
}

/**
 * Lee la FAT completa. Cada sector de la FAT debe estar en rango, no repetirse y la cuenta debe coincidir con la
 * cabecera (un sector libre o repetido en la lista es un archivo dañado).
 * @throws ArchivoNoLegible si la lista de sectores de la FAT no cuadra.
 */
export function leerFat(sectores: SectoresDeCfb): Uint32Array {
  const ids = sectoresDeLaFat(sectores);
  const { sectoresDeFat } = sectores.cabecera;
  if (ids.length !== sectoresDeFat || new Set(ids).size !== ids.length || ids.includes(SECTOR_LIBRE)) {
    throw new ArchivoNoLegible();
  }
  return enteros(Buffer.concat(ids.map((id) => sectores.sector(id))));
}

/**
 * Los sectores de una cadena, en orden. Se corta con un error si se sale de la tabla, repite un sector (ciclo),
 * pasa del largo máximo o toca un valor especial (libre, FAT o DIFAT) antes de terminar.
 * @param tabla la FAT (o la mini FAT) con el siguiente sector de cada uno.
 * @throws ArchivoNoLegible si la cadena está dañada.
 */
export function leerCadena(inicio: number, tabla: Uint32Array, maximoDeSectores: number): number[] {
  const cadena: number[] = [];
  const visitados = new Set<number>();
  let actual = inicio;
  while (actual !== FIN_DE_CADENA) {
    if (actual >= tabla.length || visitados.has(actual) || cadena.length >= maximoDeSectores) {
      throw new ArchivoNoLegible();
    }
    visitados.add(actual);
    cadena.push(actual);
    actual = tabla[actual] as number;
  }
  return cadena;
}
