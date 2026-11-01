import { cfbDePrueba, type FlujoDePrueba } from './cfb-de-prueba.js';
import { REGISTRO } from './registros-biff.js';

/** Una celda de prueba: texto, número, vacía, o una fórmula con su valor guardado. */
export type CeldaDePrueba = string | number | null | { formula: string | number };

export interface OpcionesDeXlsDePrueba {
  /** Bytes de datos por registro SST/CONTINUE; con menos que 8224 se fuerzan cortes en medio de las cadenas. */
  corteDeLasCadenas?: number;
  /** Al cruzar un corte, las letras que quedan pueden pasar de UTF-16 a comprimido (como hace Excel). */
  cambiarAncho?: boolean;
  /** Registros extra en el área global, antes de su EOF. */
  globales?: Buffer[];
  /** Registros extra en la primera hoja, antes de su EOF. */
  hoja?: Buffer[];
  /** Hojas siguientes, cada una con sus registros entre el BOF y el EOF. */
  otrasHojas?: Buffer[][];
  /** Rellena con ceros el libro hasta 4096 bytes para que no use el mini flujo. */
  flujoGrande?: boolean;
  /** Flujos extra del contenedor (propiedades, almacenes, etc.). */
  flujos?: FlujoDePrueba[];
  tamanoDeSector?: 512 | 4096;
  /** Versión del BOF del libro; 0x0500 es la de Excel 5/95. */
  versionDeBiff?: number;
}

/** Un registro BIFF: tipo, largo y datos. */
export function registroBiff(tipo: number, datos: Buffer = Buffer.alloc(0)): Buffer {
  const cabecera = Buffer.alloc(4);
  cabecera.writeUInt16LE(tipo, 0);
  cabecera.writeUInt16LE(datos.length, 2);
  return Buffer.concat([cabecera, datos]);
}

export function bof(tipo: number, version = 0x0600): Buffer {
  const datos = Buffer.alloc(16);
  datos.writeUInt16LE(version, 0);
  datos.writeUInt16LE(tipo, 2);
  return registroBiff(REGISTRO.BOF, datos);
}

const eof = () => registroBiff(REGISTRO.EOF);

function u16(...valores: number[]): Buffer {
  const bytes = Buffer.alloc(valores.length * 2);
  valores.forEach((valor, i) => bytes.writeUInt16LE(valor, i * 2));
  return bytes;
}

export function boundsheet(posicion: number, nombre: string, tipo = 0): Buffer {
  const datos = Buffer.concat([
    Buffer.alloc(4),
    Buffer.from([0, tipo, nombre.length, 0]),
    Buffer.from(nombre, 'latin1'),
  ]);
  datos.writeUInt32LE(posicion, 0);
  return registroBiff(REGISTRO.BOUNDSHEET, datos);
}

const tieneLetrasAltas = (texto: string) => [...texto].some((letra) => letra.charCodeAt(0) > 255);

/** Arma el SST y sus CONTINUE: los cortes caen en medio de las letras y llevan su byte de banderas. */
class EscritorDeCadenas {
  private readonly segmentos: Buffer[] = [];
  private actual: number[] = [];

  constructor(
    private readonly capacidad: number,
    private readonly cambiarAncho: boolean,
  ) {}

  escribir(cadenas: string[], total: number): Buffer[] {
    const cabecera = Buffer.alloc(8);
    cabecera.writeUInt32LE(total, 0);
    cabecera.writeUInt32LE(cadenas.length, 4);
    this.atomo([...cabecera]);
    cadenas.forEach((cadena) => this.cadena(cadena));
    this.cerrar();
    return this.segmentos;
  }

  private atomo(bytes: number[]): void {
    if (this.actual.length + bytes.length > this.capacidad) this.cerrar();
    this.actual.push(...bytes);
  }

  private cerrar(): void {
    this.segmentos.push(Buffer.from(this.actual));
    this.actual = [];
  }

  private cadena(texto: string): void {
    let alta = tieneLetrasAltas(texto);
    this.atomo([texto.length & 0xff, texto.length >> 8, alta ? 1 : 0]);
    for (let i = 0; i < texto.length; i++) {
      if (this.actual.length + (alta ? 2 : 1) > this.capacidad) {
        this.cerrar();
        alta = this.cambiarAncho ? tieneLetrasAltas(texto.slice(i)) : alta;
        this.actual.push(alta ? 1 : 0);
      }
      const codigo = texto.charCodeAt(i);
      this.actual.push(codigo & 0xff);
      if (alta) this.actual.push(codigo >> 8);
    }
  }
}

function registrosDeCadenas(cadenas: string[], total: number, opciones: OpcionesDeXlsDePrueba): Buffer[] {
  if (cadenas.length === 0) return [];
  const capacidad = opciones.corteDeLasCadenas ?? 8224;
  const segmentos = new EscritorDeCadenas(capacidad, opciones.cambiarAncho ?? false).escribir(cadenas, total);
  return segmentos.map((datos, i) => registroBiff(i === 0 ? REGISTRO.SST : REGISTRO.CONTINUE, datos));
}

function celdaFormula(fila: number, columna: number, valor: string | number): Buffer[] {
  const datos = Buffer.alloc(22);
  datos.writeUInt16LE(fila, 0);
  datos.writeUInt16LE(columna, 2);
  if (typeof valor === 'number') datos.writeDoubleLE(valor, 6);
  else datos.writeUInt16LE(0xffff, 12);
  const formula = registroBiff(REGISTRO.FORMULA, datos);
  if (typeof valor === 'number') return [formula];
  const texto = Buffer.concat([u16(valor.length), Buffer.from([0]), Buffer.from(valor, 'latin1')]);
  return [formula, registroBiff(REGISTRO.STRING, texto)];
}

export function celdaNumero(fila: number, columna: number, valor: number): Buffer {
  const datos = Buffer.alloc(14);
  datos.writeUInt16LE(fila, 0);
  datos.writeUInt16LE(columna, 2);
  datos.writeDoubleLE(valor, 6);
  return registroBiff(REGISTRO.NUMBER, datos);
}

/** Un LABELSST para la celda; `indice` es la posición de su texto en la tabla de cadenas. */
export function celdaDeCadena(fila: number, columna: number, indice: number): Buffer {
  const datos = Buffer.alloc(10);
  datos.writeUInt16LE(fila, 0);
  datos.writeUInt16LE(columna, 2);
  datos.writeUInt32LE(indice, 6);
  return registroBiff(REGISTRO.LABELSST, datos);
}

function registrosDeLaHoja(filas: CeldaDePrueba[][], indices: Map<string, number>): Buffer[] {
  const registros: Buffer[] = [];
  filas.forEach((celdas, fila) =>
    celdas.forEach((celda, columna) => {
      if (celda === null) return;
      if (typeof celda === 'number') registros.push(celdaNumero(fila, columna, celda));
      else if (typeof celda === 'string') registros.push(celdaDeCadena(fila, columna, indices.get(celda) as number));
      else registros.push(...celdaFormula(fila, columna, celda.formula));
    }),
  );
  return registros;
}

function armarLibro(hojas: Buffer[][], globales: Buffer[], version?: number): Buffer {
  const armar = (posiciones: number[]) =>
    Buffer.concat([
      bof(0x0005, version),
      ...hojas.map((_, i) => boundsheet(posiciones[i] ?? 0, `Hoja${i + 1}`)),
      ...globales,
      eof(),
    ]);
  const cuerpos = hojas.map((registros) => Buffer.concat([bof(0x0010), ...registros, eof()]));
  let posicion = armar([]).length;
  const posiciones = cuerpos.map((cuerpo) => {
    const actual = posicion;
    posicion += cuerpo.length;
    return actual;
  });
  return Buffer.concat([armar(posiciones), ...cuerpos]);
}

/**
 * Un `.xls` (BIFF8 en contenedor OLE2) hecho a mano con datos inventados, para probar el lector sin archivos reales.
 * Con las opciones se fuerzan cortes de CONTINUE, hojas extra y registros prohibidos.
 */
export function xlsDePrueba(filas: CeldaDePrueba[][], opciones: OpcionesDeXlsDePrueba = {}): Buffer {
  const textos = filas.flat().filter((celda): celda is string => typeof celda === 'string');
  const unicos = [...new Set(textos)];
  const indices = new Map(unicos.map((texto, i) => [texto, i]));
  const hoja = [...registrosDeLaHoja(filas, indices), ...(opciones.hoja ?? [])];
  const globales = [...registrosDeCadenas(unicos, textos.length, opciones), ...(opciones.globales ?? [])];
  const libro = armarLibro([hoja, ...(opciones.otrasHojas ?? [])], globales, opciones.versionDeBiff);
  const flujo = opciones.flujoGrande ? Buffer.concat([libro], Math.max(libro.length, 4096)) : libro;
  return cfbDePrueba([{ nombre: 'Workbook', datos: flujo }, ...(opciones.flujos ?? [])], opciones.tamanoDeSector);
}
