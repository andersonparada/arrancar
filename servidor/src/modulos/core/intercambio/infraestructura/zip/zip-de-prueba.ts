import { crc32, deflateRawSync } from 'node:zlib';

export interface ParteDePrueba {
  nombre: string;
  contenido: Buffer;
  /** Tamaño que el zip declara; si no se da, el verdadero. Sirve para probar zips que mienten. */
  tamanoDeclarado?: number;
}

const TIPOS_DE_HOJA_NORMAL =
  '<Types><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/></Types>';
const TIPOS_CON_MACROS =
  '<Types><Override PartName="/xl/workbook.xml" ContentType="application/vnd.ms-excel.sheet.macroEnabled.main+xml"/></Types>';

export const tiposDeHojaNormal = () => Buffer.from(TIPOS_DE_HOJA_NORMAL);
export const tiposConMacros = () => Buffer.from(TIPOS_CON_MACROS);

function encabezado(firma: number, largo: number): Buffer {
  const b = Buffer.alloc(largo);
  b.writeUInt32LE(firma, 0);
  return b;
}

function local(parte: ParteDePrueba, comprimido: Buffer): Buffer {
  const nombre = Buffer.from(parte.nombre);
  const b = encabezado(0x04034b50, 30);
  b.writeUInt16LE(8, 8);
  b.writeUInt32LE(crc32(parte.contenido), 14);
  b.writeUInt32LE(comprimido.length, 18);
  b.writeUInt32LE(parte.tamanoDeclarado ?? parte.contenido.length, 22);
  b.writeUInt16LE(nombre.length, 26);
  return Buffer.concat([b, nombre, comprimido]);
}

function central(parte: ParteDePrueba, comprimido: Buffer, desplazamiento: number): Buffer {
  const nombre = Buffer.from(parte.nombre);
  const b = encabezado(0x02014b50, 46);
  b.writeUInt16LE(8, 10);
  b.writeUInt32LE(crc32(parte.contenido), 16);
  b.writeUInt32LE(comprimido.length, 20);
  b.writeUInt32LE(parte.tamanoDeclarado ?? parte.contenido.length, 24);
  b.writeUInt16LE(nombre.length, 28);
  b.writeUInt32LE(desplazamiento, 42);
  return Buffer.concat([b, nombre]);
}

/** Arma un zip con compresión deflate, como los que llegan del navegador. */
export function armarZipDePrueba(partes: ParteDePrueba[]): Buffer {
  const locales: Buffer[] = [];
  const centrales: Buffer[] = [];
  let desplazamiento = 0;
  for (const parte of partes) {
    const comprimido = deflateRawSync(parte.contenido);
    const entrada = local(parte, comprimido);
    centrales.push(central(parte, comprimido, desplazamiento));
    locales.push(entrada);
    desplazamiento += entrada.length;
  }
  const directorio = Buffer.concat(centrales);
  const fin = encabezado(0x06054b50, 22);
  fin.writeUInt16LE(partes.length, 8);
  fin.writeUInt16LE(partes.length, 10);
  fin.writeUInt32LE(directorio.length, 12);
  fin.writeUInt32LE(desplazamiento, 16);
  return Buffer.concat([...locales, directorio, fin]);
}

/** Un `[Content_Types].xml` con hoja normal más las partes que se pidan. */
export function excelDePrueba(otras: ParteDePrueba[] = [], tipos = tiposDeHojaNormal()): Buffer {
  return armarZipDePrueba([{ nombre: '[Content_Types].xml', contenido: tipos }, ...otras]);
}

/** Una parte de `megabytes` MB de ceros: pesa unos KB comprimida y megabytes inflada. */
export const parteDeCeros = (nombre: string, megabytes: number): ParteDePrueba => ({
  nombre,
  contenido: Buffer.alloc(megabytes * 1024 * 1024),
});
