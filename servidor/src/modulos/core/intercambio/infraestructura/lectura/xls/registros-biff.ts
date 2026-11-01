import { ArchivoNoLegible, ExcelConContenidoNoPermitido } from '../../../aplicacion/errores.js';
import { ExcelAntiguoNoAdmitido, ExcelCifrado } from '../../../aplicacion/errores-de-lectura.js';

/** Tipos de registro de BIFF8 que el lector usa o vigila (ver [MS-XLS]). */
export const REGISTRO = {
  BOF: 0x0809,
  EOF: 0x000a,
  CONTINUE: 0x003c,
  BOUNDSHEET: 0x0085,
  SST: 0x00fc,
  FILEPASS: 0x002f,
  NAME: 0x0018,
  OBJ: 0x005d,
  MSODRAWING: 0x00ec,
  MSODRAWINGGROUP: 0x00eb,
  MSODRAWINGSELECTION: 0x00ed,
  TXO: 0x01b6,
  LABELSST: 0x00fd,
  LABEL: 0x0204,
  RSTRING: 0x00d6,
  NUMBER: 0x0203,
  RK: 0x027e,
  MULRK: 0x00bd,
  MULBLANK: 0x00be,
  BOOLERR: 0x0205,
  FORMULA: 0x0006,
  STRING: 0x0207,
} as const;

/** Un registro BIFF no pasa de 8,224 bytes de datos. */
const MAXIMO_DEL_REGISTRO = 8224;
const VERSION_BIFF8 = 0x0600;
const VERSION_BIFF5 = 0x0500;
export const SUBFLUJO_DEL_LIBRO = 0x0005;
export const SUBFLUJO_DE_HOJA = 0x0010;
const HOJA_DE_CALCULO = 0;
const NOMBRES_AUTOEJECUTABLES = new Set(['auto_open', 'auto_close']);
/** Registros de dibujos, objetos y cuadros de texto: el libro de datos no los trae. */
const REGISTROS_DE_OBJETOS = new Set<number>([
  REGISTRO.OBJ,
  REGISTRO.MSODRAWING,
  REGISTRO.MSODRAWINGGROUP,
  REGISTRO.MSODRAWINGSELECTION,
  REGISTRO.TXO,
]);

/** Un registro: su tipo, dónde empieza en el flujo y sus datos. */
export interface RegistroBiff {
  tipo: number;
  inicio: number;
  datos: Buffer;
}

/**
 * Recorre los registros del flujo `Workbook`. Cada registro son 4 bytes de cabecera más sus datos; como cada uno
 * consume al menos 4 bytes, el número de registros nunca pasa de un cuarto del tamaño del flujo.
 * @throws ArchivoNoLegible si un registro pasa de 8,224 bytes o se sale del flujo.
 */
export function* registrosDe(flujo: Buffer): Generator<RegistroBiff> {
  let posicion = 0;
  while (posicion + 4 <= flujo.length) {
    const largo = flujo.readUInt16LE(posicion + 2);
    const fin = posicion + 4 + largo;
    if (largo > MAXIMO_DEL_REGISTRO || fin > flujo.length) throw new ArchivoNoLegible();
    yield { tipo: flujo.readUInt16LE(posicion), inicio: posicion, datos: flujo.subarray(posicion + 4, fin) };
    posicion = fin;
  }
}

function exigirLargo(datos: Buffer, minimo: number): void {
  if (datos.length < minimo) throw new ArchivoNoLegible();
}

/** El nombre de una definición (registro NAME); los nombres internos de Excel son un solo código. */
function esNombreAutoejecutable(datos: Buffer): boolean {
  exigirLargo(datos, 15);
  const esInterno = (datos.readUInt16LE(0) & 0x0020) !== 0;
  if (esInterno) return datos[15] === 0x01 || datos[15] === 0x02;
  const letras = datos[3] as number;
  const alta = ((datos[14] as number) & 1) === 1;
  const fin = 15 + (alta ? letras * 2 : letras);
  exigirLargo(datos, fin);
  return NOMBRES_AUTOEJECUTABLES.has(datos.toString(alta ? 'utf16le' : 'latin1', 15, fin).toLowerCase());
}

/** Solo hojas de cálculo: las de macros (1) y los módulos VB (6) llevan código. */
function exigirHojaDeCalculo(datos: Buffer): void {
  exigirLargo(datos, 6);
  if (datos[5] !== HOJA_DE_CALCULO) throw new ExcelConContenidoNoPermitido();
}

function exigirSubflujoPermitido(datos: Buffer): void {
  exigirLargo(datos, 4);
  const tipo = datos.readUInt16LE(2);
  if (tipo !== SUBFLUJO_DEL_LIBRO && tipo !== SUBFLUJO_DE_HOJA) throw new ExcelConContenidoNoPermitido();
}

/**
 * Rechaza lo que un libro de datos no necesita y puede ser peligroso: contraseña, objetos y dibujos incrustados,
 * hojas de macros o de gráficos, y nombres que Excel ejecuta al abrir. Se revisa en todos los registros del flujo,
 * no solo en los de la primera hoja.
 * @throws ExcelCifrado o ExcelConContenidoNoPermitido.
 */
export function exigirRegistroPermitido({ tipo, datos }: RegistroBiff): void {
  if (tipo === REGISTRO.FILEPASS) throw new ExcelCifrado();
  if (REGISTROS_DE_OBJETOS.has(tipo)) throw new ExcelConContenidoNoPermitido();
  if (tipo === REGISTRO.BOUNDSHEET) exigirHojaDeCalculo(datos);
  if (tipo === REGISTRO.BOF) exigirSubflujoPermitido(datos);
  if (tipo === REGISTRO.NAME && esNombreAutoejecutable(datos)) throw new ExcelConContenidoNoPermitido();
}

/** El primer registro debe ser el BOF del libro en BIFF8; un BIFF5 (Excel 5/95) es demasiado antiguo. */
export function exigirInicioDeBiff8(registro: RegistroBiff): void {
  const { tipo, datos } = registro;
  if (tipo !== REGISTRO.BOF) throw new ArchivoNoLegible();
  exigirLargo(datos, 4);
  const version = datos.readUInt16LE(0);
  if (version === VERSION_BIFF5) throw new ExcelAntiguoNoAdmitido();
  if (version !== VERSION_BIFF8) throw new ArchivoNoLegible();
  if (datos.readUInt16LE(2) !== SUBFLUJO_DEL_LIBRO) throw new ArchivoNoLegible();
}
