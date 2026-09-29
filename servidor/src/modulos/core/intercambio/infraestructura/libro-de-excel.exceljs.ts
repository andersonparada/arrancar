import ExcelJS from 'exceljs';
import { ArchivoNoLegible } from '../aplicacion/errores.js';
import { ValidadorDeXlsx } from './zip/validador-de-xlsx.js';
import type { FilaLeida, HojaLeida, HojaParaEscribir, LibroDeExcel } from '../aplicacion/puertos/libro-de-excel.js';

const ANCHO_DE_COLUMNA = 22;
/** Excel no acepta nombres de hoja de más de 31 caracteres. */
const LARGO_DE_NOMBRE_DE_HOJA = 31;

/** Una celda puede traer texto enriquecido, fórmulas o enlaces: se queda con lo que se ve. */
function valorVisible(valor: ExcelJS.CellValue): unknown {
  if (valor === null || typeof valor !== 'object' || valor instanceof Date) return valor;
  if ('result' in valor) return valor.result ?? null;
  if ('richText' in valor) return valor.richText.map((parte) => parte.text).join('');
  if ('text' in valor) return valor.text;
  return null;
}

function celdasDe(fila: ExcelJS.Row, columnas: number): unknown[] {
  return Array.from({ length: columnas }, (_, i) => valorVisible(fila.getCell(i + 1).value));
}

const vacia = (celdas: unknown[]) => celdas.every((celda) => celda === null || celda === undefined || celda === '');

function agregarHoja(libro: ExcelJS.Workbook, nombre: string, filas: unknown[][]): ExcelJS.Worksheet {
  const hoja = libro.addWorksheet(nombre.slice(0, LARGO_DE_NOMBRE_DE_HOJA), {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  hoja.addRows(filas);
  hoja.getRow(1).font = { bold: true };
  // Una hoja sin filas no tiene columnas: exceljs devuelve null.
  (hoja.columns as ExcelJS.Column[] | null)?.forEach((columna) => (columna.width = ANCHO_DE_COLUMNA));
  hoja.eachRow((fila) => fila.eachCell((celda) => celda.value instanceof Date && (celda.numFmt = 'dd/mm/yyyy')));
  return hoja;
}

/** Excel con la librería exceljs: la primera hoja lleva los datos y la segunda, las instrucciones. */
export class LibroDeExcelJs implements LibroDeExcel {
  constructor(private readonly validador = new ValidadorDeXlsx()) {}

  async escribir({ nombre, encabezados, filas, instrucciones }: HojaParaEscribir): Promise<Buffer> {
    const libro = new ExcelJS.Workbook();
    agregarHoja(libro, nombre, [encabezados, ...filas]);
    agregarHoja(libro, 'Instrucciones', instrucciones);
    return Buffer.from(await libro.xlsx.writeBuffer());
  }

  async leer(contenido: Buffer): Promise<HojaLeida> {
    const seguro = this.validador.sanear(contenido);
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(seguro as unknown as ArrayBuffer).catch(() => {
      throw new ArchivoNoLegible();
    });
    const hoja = libro.worksheets[0];
    if (!hoja) throw new ArchivoNoLegible();
    const encabezados = celdasDe(hoja.getRow(1), hoja.columnCount).map((celda) => String(celda ?? ''));
    const filas: FilaLeida[] = [];
    hoja.eachRow((fila, numero) => {
      const celdas = celdasDe(fila, encabezados.length);
      if (numero > 1 && !vacia(celdas)) filas.push({ numero, celdas });
    });
    return { encabezados, filas };
  }
}
