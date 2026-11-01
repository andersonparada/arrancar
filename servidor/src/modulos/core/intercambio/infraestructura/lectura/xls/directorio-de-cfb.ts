import { ArchivoNoLegible, ExcelConContenidoNoPermitido } from '../../../aplicacion/errores.js';
import { ExcelAntiguoNoAdmitido } from '../../../aplicacion/errores-de-lectura.js';

const TAMANO_DE_ENTRADA = 128;
const MAXIMO_DE_ENTRADAS = 32;
const TIPO_RAIZ = 5;
const TIPO_FLUJO = 2;
const TIPO_LIBRE = 0;
const NOMBRE_DE_LA_RAIZ = 'Root Entry';
export const NOMBRE_DEL_LIBRO = 'Workbook';
/** Excel 5 y 95 guardan el libro en `Book`. */
const NOMBRE_DEL_LIBRO_ANTIGUO = 'Book';
/** Los únicos flujos que puede traer un `.xls` sin contenido activo: el libro y sus propiedades. */
const FLUJOS_PERMITIDOS = new Set([
  NOMBRE_DEL_LIBRO,
  '\u0005SummaryInformation',
  '\u0005DocumentSummaryInformation',
  '\u0001CompObj',
]);

/** Una entrada del directorio del contenedor: la raíz o un flujo de la lista blanca. */
export interface EntradaDeCfb {
  nombre: string;
  primerSector: number;
  tamano: number;
}

export interface DirectorioDeCfb {
  raiz: EntradaDeCfb;
  libro: EntradaDeCfb;
}

function leerEntrada(flujo: Buffer, posicion: number): (EntradaDeCfb & { tipo: number }) | null {
  const tipo = flujo.readUInt8(posicion + 66);
  if (tipo === TIPO_LIBRE) return null;
  const largoDelNombre = flujo.readUInt16LE(posicion + 64);
  if (largoDelNombre < 2 || largoDelNombre > 64 || largoDelNombre % 2 !== 0) throw new ArchivoNoLegible();
  if (flujo.readUInt32LE(posicion + 124) !== 0) throw new ArchivoNoLegible();
  return {
    tipo,
    nombre: flujo.toString('utf16le', posicion, posicion + largoDelNombre - 2),
    primerSector: flujo.readUInt32LE(posicion + 116),
    tamano: flujo.readUInt32LE(posicion + 120),
  };
}

function entradasDe(flujo: Buffer): (EntradaDeCfb & { tipo: number })[] {
  const entradas: (EntradaDeCfb & { tipo: number })[] = [];
  for (let posicion = 0; posicion + TAMANO_DE_ENTRADA <= flujo.length; posicion += TAMANO_DE_ENTRADA) {
    const entrada = leerEntrada(flujo, posicion);
    if (entrada) entradas.push(entrada);
    if (entradas.length > MAXIMO_DE_ENTRADAS) throw new ExcelConContenidoNoPermitido();
  }
  return entradas;
}

/** Un almacén (storage) es donde Excel guarda macros (`_VBA_PROJECT_CUR`), objetos incrustados y datos cifrados. */
function exigirFlujoPermitido(entrada: EntradaDeCfb & { tipo: number }): void {
  if (entrada.nombre === NOMBRE_DEL_LIBRO_ANTIGUO) throw new ExcelAntiguoNoAdmitido();
  if (entrada.tipo !== TIPO_FLUJO || !FLUJOS_PERMITIDOS.has(entrada.nombre)) throw new ExcelConContenidoNoPermitido();
}

/**
 * Lee el directorio y lo compara con la lista blanca: la raíz, `Workbook` y las propiedades del documento. Cualquier
 * otra cosa (un almacén de macros, objetos, un flujo desconocido) se rechaza, y un `Book` de Excel 5/95 también.
 * @param flujo el directorio ya leído de sus sectores.
 * @throws ExcelConContenidoNoPermitido, ExcelAntiguoNoAdmitido o ArchivoNoLegible.
 */
export function leerDirectorio(flujo: Buffer): DirectorioDeCfb {
  const [raiz, ...flujos] = entradasDe(flujo);
  if (raiz?.tipo !== TIPO_RAIZ || raiz.nombre !== NOMBRE_DE_LA_RAIZ) throw new ArchivoNoLegible();
  flujos.forEach(exigirFlujoPermitido);
  const nombres = flujos.map((entrada) => entrada.nombre);
  const libro = flujos.find((entrada) => entrada.nombre === NOMBRE_DEL_LIBRO);
  if (!libro || new Set(nombres).size !== nombres.length) throw new ArchivoNoLegible();
  return { raiz, libro };
}
