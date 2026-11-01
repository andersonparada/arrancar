import { ArchivoNoLegible } from '../../../aplicacion/errores.js';
import { REGISTRO } from './registros-biff.js';

/** Una celda con valor. `texto` es `null` cuando es una fórmula de texto cuyo valor viene en el registro STRING que sigue. */
export interface CeldaBiff {
  fila: number;
  columna: number;
  texto: string | null;
}

type Decodificador = (datos: Buffer, cadenas: readonly string[]) => CeldaBiff[];

const FORMULA_CON_VALOR_ESPECIAL = 0xffff;
const TIPO_CADENA = 0;
const TIPO_LOGICO = 1;

function exigirLargo(datos: Buffer, minimo: number): void {
  if (datos.length < minimo) throw new ArchivoNoLegible();
}

const numeroATexto = (numero: number): string => (Number.isFinite(numero) ? String(numero) : '');

/** Un número RK: entero de 30 bits o los 30 bits altos de un double, y opcionalmente dividido entre 100. */
export function valorDeRk(rk: number): number {
  const centesimas = (rk & 0x01) !== 0;
  const esEntero = (rk & 0x02) !== 0;
  let valor: number;
  if (esEntero) valor = rk >> 2;
  else {
    const bytes = Buffer.alloc(8);
    bytes.writeUInt32LE((rk & 0xfffffffc) >>> 0, 4);
    valor = bytes.readDoubleLE(0);
  }
  return centesimas ? valor / 100 : valor;
}

/** Cadena con largo de 2 bytes y banderas: la usan LABEL, RSTRING y STRING. */
export function leerCadenaConLargo(datos: Buffer, posicion: number): string {
  exigirLargo(datos, posicion + 3);
  const letras = datos.readUInt16LE(posicion);
  const alta = ((datos[posicion + 2] as number) & 0x01) === 1;
  const fin = posicion + 3 + (alta ? letras * 2 : letras);
  exigirLargo(datos, fin);
  return datos.toString(alta ? 'utf16le' : 'latin1', posicion + 3, fin);
}

const celda = (datos: Buffer, texto: string | null): CeldaBiff => ({
  fila: datos.readUInt16LE(0),
  columna: datos.readUInt16LE(2),
  texto,
});

function cadenaCompartida(datos: Buffer, cadenas: readonly string[]): CeldaBiff[] {
  exigirLargo(datos, 10);
  const texto = cadenas[datos.readUInt32LE(6)];
  if (texto === undefined) throw new ArchivoNoLegible();
  return [celda(datos, texto)];
}

function cadenaEnLaCelda(datos: Buffer): CeldaBiff[] {
  exigirLargo(datos, 9);
  return [celda(datos, leerCadenaConLargo(datos, 6))];
}

function numero(datos: Buffer): CeldaBiff[] {
  exigirLargo(datos, 14);
  return [celda(datos, numeroATexto(datos.readDoubleLE(6)))];
}

function numeroRk(datos: Buffer): CeldaBiff[] {
  exigirLargo(datos, 10);
  return [celda(datos, numeroATexto(valorDeRk(datos.readUInt32LE(6))))];
}

/** Los registros de varias celdas (MULRK, MULBLANK) traen la columna final al cierre y deben cuadrar con su largo. */
function columnasDeVarias(datos: Buffer, bytesPorCelda: number): { primera: number; cuantas: number } {
  exigirLargo(datos, 6);
  const cuantas = (datos.length - 6) / bytesPorCelda;
  const primera = datos.readUInt16LE(2);
  if (!Number.isInteger(cuantas) || datos.readUInt16LE(datos.length - 2) !== primera + cuantas - 1) {
    throw new ArchivoNoLegible();
  }
  return { primera, cuantas };
}

function variosNumerosRk(datos: Buffer): CeldaBiff[] {
  const { primera, cuantas } = columnasDeVarias(datos, 6);
  const fila = datos.readUInt16LE(0);
  return Array.from({ length: cuantas }, (_, i) => ({
    fila,
    columna: primera + i,
    texto: numeroATexto(valorDeRk(datos.readUInt32LE(6 + i * 6))),
  }));
}

/** Las celdas en blanco no guardan nada; solo se revisa que el registro sea coherente. */
function variasEnBlanco(datos: Buffer): CeldaBiff[] {
  columnasDeVarias(datos, 2);
  return [];
}

/** Un valor lógico se lee como `true` o `false`; un error de celda, como vacío. */
function logicoOError(datos: Buffer): CeldaBiff[] {
  exigirLargo(datos, 8);
  const esError = datos[7] !== 0;
  return esError ? [] : [celda(datos, datos[6] === 0 ? 'false' : 'true')];
}

/** El valor guardado de una fórmula; nunca se evalúa. */
function formula(datos: Buffer): CeldaBiff[] {
  exigirLargo(datos, 22);
  if (datos.readUInt16LE(12) !== FORMULA_CON_VALOR_ESPECIAL) return [celda(datos, numeroATexto(datos.readDoubleLE(6)))];
  const tipo = datos[6];
  if (tipo === TIPO_CADENA) return [celda(datos, null)];
  if (tipo === TIPO_LOGICO) return [celda(datos, datos[8] === 0 ? 'false' : 'true')];
  return [];
}

/** Cómo se lee cada registro de celda; los demás (en blanco, formatos, filas) no aportan valores. */
const DECODIFICADORES = new Map<number, Decodificador>([
  [REGISTRO.LABELSST, cadenaCompartida],
  [REGISTRO.LABEL, cadenaEnLaCelda],
  [REGISTRO.RSTRING, cadenaEnLaCelda],
  [REGISTRO.NUMBER, numero],
  [REGISTRO.RK, numeroRk],
  [REGISTRO.MULRK, variosNumerosRk],
  [REGISTRO.MULBLANK, variasEnBlanco],
  [REGISTRO.BOOLERR, logicoOError],
  [REGISTRO.FORMULA, formula],
]);

/** Las celdas con valor de un registro de la hoja, o ninguna si el registro no es de celdas. */
export function celdasDelRegistro(tipo: number, datos: Buffer, cadenas: readonly string[]): CeldaBiff[] {
  return DECODIFICADORES.get(tipo)?.(datos, cadenas) ?? [];
}
