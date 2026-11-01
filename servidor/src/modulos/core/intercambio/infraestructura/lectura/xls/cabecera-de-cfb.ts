import { ArchivoNoLegible } from '../../../aplicacion/errores.js';

/** Marca el final de una cadena de sectores. */
export const FIN_DE_CADENA = 0xfffffffe;
/** Sector sin usar: nunca puede estar dentro de una cadena ni en la lista de sectores de la FAT. */
export const SECTOR_LIBRE = 0xffffffff;

const FIRMA = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const TAMANO_DE_LA_CABECERA = 512;
const ENTRADAS_DE_DIFAT_EN_LA_CABECERA = 109;
const CORTE_DEL_MINI_FLUJO = 4096;
const TAMANO_DE_MINI_SECTOR = 64;

/** Lo que dice la cabecera de un contenedor OLE2 (CFB), ya comprobado contra el tamaño real del archivo. */
export interface CabeceraDeCfb {
  tamanoDeSector: number;
  tamanoDeMiniSector: number;
  corteDelMiniFlujo: number;
  /** Sectores completos que caben en el archivo, sin contar la cabecera. */
  sectoresEnElArchivo: number;
  sectoresDeFat: number;
  primerSectorDelDirectorio: number;
  primerSectorDeLaMiniFat: number;
  sectoresDeLaMiniFat: number;
  primerSectorDeDifat: number;
  sectoresDeDifat: number;
  /** Los sectores de la FAT que la cabecera lista directamente (hasta 109). */
  difatDeLaCabecera: number[];
}

/** Tamaño de sector según la versión: 3 usa 512 bytes (desplazamiento 9) y 4 usa 4096 (desplazamiento 12). */
function tamanoDeSectorSegunVersion(cabecera: Buffer): number {
  const version = cabecera.readUInt16LE(26);
  const desplazamiento = cabecera.readUInt16LE(30);
  if (version === 3 && desplazamiento === 9) return 512;
  if (version === 4 && desplazamiento === 12) return 4096;
  throw new ArchivoNoLegible();
}

/** Lee una cuenta de sectores y exige que quepa en el archivo (una cuenta enorme es un archivo mentiroso). */
function cuenta(cabecera: Buffer, posicion: number, maximo: number): number {
  const valor = cabecera.readUInt32LE(posicion);
  if (valor > maximo) throw new ArchivoNoLegible();
  return valor;
}

/** Firma, orden de bytes, desplazamiento del mini sector y corte del mini flujo: valores fijos en un CFB normal. */
function exigirValoresFijos(archivo: Buffer): void {
  const sonFijos =
    archivo.length >= TAMANO_DE_LA_CABECERA &&
    archivo.subarray(0, FIRMA.length).equals(FIRMA) &&
    archivo.readUInt16LE(28) === 0xfffe &&
    archivo.readUInt16LE(32) === 6 &&
    archivo.readUInt32LE(56) === CORTE_DEL_MINI_FLUJO;
  if (!sonFijos) throw new ArchivoNoLegible();
}

/**
 * Valida y lee la cabecera: firma, orden de bytes, versión, tamaños fijos y que ninguna cuenta de sectores pase
 * de los que caben en el archivo.
 * @throws ArchivoNoLegible si la cabecera no es la de un contenedor CFB normal.
 */
export function leerCabeceraDeCfb(archivo: Buffer): CabeceraDeCfb {
  exigirValoresFijos(archivo);
  const tamanoDeSector = tamanoDeSectorSegunVersion(archivo);
  const sectoresEnElArchivo = Math.floor((archivo.length - tamanoDeSector) / tamanoDeSector);
  if (sectoresEnElArchivo < 2) throw new ArchivoNoLegible();
  const sectoresDeFat = cuenta(archivo, 44, sectoresEnElArchivo);
  if (sectoresDeFat < 1) throw new ArchivoNoLegible();
  return {
    tamanoDeSector,
    tamanoDeMiniSector: TAMANO_DE_MINI_SECTOR,
    corteDelMiniFlujo: CORTE_DEL_MINI_FLUJO,
    sectoresEnElArchivo,
    sectoresDeFat,
    primerSectorDelDirectorio: archivo.readUInt32LE(48),
    primerSectorDeLaMiniFat: archivo.readUInt32LE(60),
    sectoresDeLaMiniFat: cuenta(archivo, 64, sectoresEnElArchivo),
    primerSectorDeDifat: archivo.readUInt32LE(68),
    sectoresDeDifat: cuenta(archivo, 72, sectoresEnElArchivo),
    difatDeLaCabecera: Array.from({ length: Math.min(sectoresDeFat, ENTRADAS_DE_DIFAT_EN_LA_CABECERA) }, (_, i) =>
      archivo.readUInt32LE(76 + i * 4),
    ),
  };
}

/** Acceso a los sectores del archivo; un sector fuera de rango o truncado es un archivo dañado. */
export class SectoresDeCfb {
  constructor(
    readonly archivo: Buffer,
    readonly cabecera: CabeceraDeCfb,
  ) {}

  sector(id: number): Buffer {
    const { tamanoDeSector, sectoresEnElArchivo } = this.cabecera;
    if (id >= sectoresEnElArchivo) throw new ArchivoNoLegible();
    const inicio = (id + 1) * tamanoDeSector;
    return this.archivo.subarray(inicio, inicio + tamanoDeSector);
  }
}
