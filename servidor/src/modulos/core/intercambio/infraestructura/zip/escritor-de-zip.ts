import { crc32 } from 'node:zlib';

const FIRMA_ENCABEZADO_LOCAL = 0x04034b50;
const FIRMA_DIRECTORIO_CENTRAL = 0x02014b50;
const FIRMA_FIN_DE_DIRECTORIO = 0x06054b50;
const VERSION = 20;
const NOMBRES_EN_UTF8 = 0x0800;
/** 1 de enero de 1980, la fecha más antigua que admite el formato. */
const FECHA_MINIMA = 0x21;

export interface ParteDeZip {
  nombre: string;
  contenido: Buffer;
}

function encabezadoLocal(nombre: Buffer, contenido: Buffer): Buffer {
  const b = Buffer.alloc(30);
  b.writeUInt32LE(FIRMA_ENCABEZADO_LOCAL, 0);
  b.writeUInt16LE(VERSION, 4);
  b.writeUInt16LE(NOMBRES_EN_UTF8, 6);
  b.writeUInt16LE(FECHA_MINIMA, 12);
  b.writeUInt32LE(crc32(contenido), 14);
  b.writeUInt32LE(contenido.length, 18);
  b.writeUInt32LE(contenido.length, 22);
  b.writeUInt16LE(nombre.length, 26);
  return b;
}

function encabezadoCentral(nombre: Buffer, contenido: Buffer, desplazamiento: number): Buffer {
  const b = Buffer.alloc(46);
  b.writeUInt32LE(FIRMA_DIRECTORIO_CENTRAL, 0);
  b.writeUInt16LE(VERSION, 4);
  b.writeUInt16LE(VERSION, 6);
  b.writeUInt16LE(NOMBRES_EN_UTF8, 8);
  b.writeUInt16LE(FECHA_MINIMA, 14);
  b.writeUInt32LE(crc32(contenido), 16);
  b.writeUInt32LE(contenido.length, 20);
  b.writeUInt32LE(contenido.length, 24);
  b.writeUInt16LE(nombre.length, 28);
  b.writeUInt32LE(desplazamiento, 42);
  return b;
}

function finDeDirectorio(cantidad: number, tamano: number, inicio: number): Buffer {
  const b = Buffer.alloc(22);
  b.writeUInt32LE(FIRMA_FIN_DE_DIRECTORIO, 0);
  b.writeUInt16LE(cantidad, 8);
  b.writeUInt16LE(cantidad, 10);
  b.writeUInt32LE(tamano, 12);
  b.writeUInt32LE(inicio, 16);
  return b;
}

/**
 * Arma un zip sin compresión con las partes dadas. Sirve para entregarle a la
 * librería de Excel solo lo ya revisado, en un formato que no se puede inflar.
 */
export function armarZipSinCompresion(partes: ParteDeZip[]): Buffer {
  const locales: Buffer[] = [];
  const centrales: Buffer[] = [];
  let desplazamiento = 0;
  for (const { nombre, contenido } of partes) {
    const nombreEnBytes = Buffer.from(nombre, 'utf8');
    const local = Buffer.concat([encabezadoLocal(nombreEnBytes, contenido), nombreEnBytes, contenido]);
    centrales.push(Buffer.concat([encabezadoCentral(nombreEnBytes, contenido, desplazamiento), nombreEnBytes]));
    locales.push(local);
    desplazamiento += local.length;
  }
  const directorio = Buffer.concat(centrales);
  return Buffer.concat([...locales, directorio, finDeDirectorio(partes.length, directorio.length, desplazamiento)]);
}
