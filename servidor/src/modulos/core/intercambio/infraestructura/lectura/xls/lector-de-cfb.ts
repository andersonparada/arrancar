import { ArchivoNoLegible } from '../../../aplicacion/errores.js';
import { leerCabeceraDeCfb, SectoresDeCfb, type CabeceraDeCfb } from './cabecera-de-cfb.js';
import { leerDirectorio, type EntradaDeCfb } from './directorio-de-cfb.js';
import { enteros, leerCadena, leerFat } from './tablas-de-cfb.js';

/** Un directorio de 32 entradas cabe en 8 sectores de 512 bytes; con relleno, 16 dan margen sin permitir abusos. */
const MAXIMO_DE_SECTORES_DEL_DIRECTORIO = 16;

const sectoresPara = (bytes: number, tamanoDeSector: number) => Math.ceil(bytes / tamanoDeSector);

/** Los bytes de una cadena de sectores normales; la cadena debe tener justo los sectores que pide el tamaño. */
function leerFlujoNormal(sectores: SectoresDeCfb, fat: Uint32Array, entrada: EntradaDeCfb): Buffer {
  const { tamanoDeSector } = sectores.cabecera;
  const necesarios = sectoresPara(entrada.tamano, tamanoDeSector);
  const cadena = leerCadena(entrada.primerSector, fat, necesarios + 1);
  if (entrada.tamano > sectores.archivo.length || cadena.length < necesarios) throw new ArchivoNoLegible();
  return Buffer.concat(cadena.map((id) => sectores.sector(id))).subarray(0, entrada.tamano);
}

/** La mini FAT, que cuenta los sectores de 64 bytes del mini flujo de la raíz. */
function leerMiniFat(sectores: SectoresDeCfb, fat: Uint32Array): Uint32Array {
  const { cabecera } = sectores;
  const cadena = leerCadena(cabecera.primerSectorDeLaMiniFat, fat, cabecera.sectoresDeLaMiniFat);
  if (cadena.length !== cabecera.sectoresDeLaMiniFat) throw new ArchivoNoLegible();
  return enteros(Buffer.concat(cadena.map((id) => sectores.sector(id))));
}

/** Los bytes de un flujo chico, que vive dentro del mini flujo de la raíz en sectores de 64 bytes. */
function leerMiniFlujo(
  contexto: { sectores: SectoresDeCfb; fat: Uint32Array; raiz: EntradaDeCfb },
  libro: EntradaDeCfb,
) {
  const { sectores, fat, raiz } = contexto;
  const { tamanoDeMiniSector } = sectores.cabecera;
  const miniFlujo = leerFlujoNormal(sectores, fat, raiz);
  const necesarios = sectoresPara(libro.tamano, tamanoDeMiniSector);
  const cadena = leerCadena(libro.primerSector, leerMiniFat(sectores, fat), necesarios + 1);
  if (cadena.length < necesarios) throw new ArchivoNoLegible();
  const partes = cadena.map((id) => miniFlujo.subarray(id * tamanoDeMiniSector, (id + 1) * tamanoDeMiniSector));
  if (partes.some((parte) => parte.length !== tamanoDeMiniSector)) throw new ArchivoNoLegible();
  return Buffer.concat(partes).subarray(0, libro.tamano);
}

function leerDirectorioDe(sectores: SectoresDeCfb, fat: Uint32Array) {
  const { cabecera } = sectores;
  const cadena = leerCadena(cabecera.primerSectorDelDirectorio, fat, MAXIMO_DE_SECTORES_DEL_DIRECTORIO);
  return leerDirectorio(Buffer.concat(cadena.map((id) => sectores.sector(id))));
}

function esMiniFlujo(cabecera: CabeceraDeCfb, tamano: number): boolean {
  return tamano < cabecera.corteDelMiniFlujo;
}

/**
 * Extrae el flujo `Workbook` de un contenedor OLE2 (.xls), revisando cada estructura antes de seguirla: cabecera,
 * FAT/DIFAT, cadenas sin ciclos ni sectores fuera de rango, y un directorio con lista blanca.
 * @throws ArchivoNoLegible, ExcelConContenidoNoPermitido o ExcelAntiguoNoAdmitido.
 */
export function extraerLibroDeCfb(archivo: Buffer): Buffer {
  const sectores = new SectoresDeCfb(archivo, leerCabeceraDeCfb(archivo));
  const fat = leerFat(sectores);
  const { raiz, libro } = leerDirectorioDe(sectores, fat);
  return esMiniFlujo(sectores.cabecera, libro.tamano)
    ? leerMiniFlujo({ sectores, fat, raiz }, libro)
    : leerFlujoNormal(sectores, fat, libro);
}
