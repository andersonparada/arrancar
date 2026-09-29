import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { CeldaConProblema } from '../aplicacion/puertos/libro-de-excel.js';
import { LibroDeExcelJs } from './libro-de-excel.exceljs.js';

async function libroConCeldas(celdas: ExcelJS.CellValue[]): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet('Datos');
  hoja.addRow(['Dato']);
  celdas.forEach((valor) => hoja.addRow([valor]));
  return Buffer.from(await libro.xlsx.writeBuffer());
}

const leerCeldas = async (celdas: ExcelJS.CellValue[]) => {
  const hoja = await new LibroDeExcelJs().leer(await libroConCeldas(celdas));
  return hoja.filas.map((fila) => fila.celdas[0]);
};

describe('libro de Excel: fórmulas', () => {
  it('una fórmula con resultado entrega el valor calculado', async () => {
    expect(await leerCeldas([{ formula: '1+1', result: 2 }])).toEqual([2]);
  });

  it('una fórmula sin valor calculado avisa que hay que guardar el archivo en Excel', async () => {
    const [celda] = await leerCeldas([{ formula: '1+1' } as ExcelJS.CellFormulaValue]);

    expect(celda).toBeInstanceOf(CeldaConProblema);
    expect((celda as CeldaConProblema).mensaje).toContain('fórmula sin valor calculado');
  });

  it('una fórmula con error (#DIV/0!) lo informa', async () => {
    const [celda] = await leerCeldas([{ formula: '1/0', result: { error: '#DIV/0!' } }]);

    expect(celda).toBeInstanceOf(CeldaConProblema);
    expect((celda as CeldaConProblema).mensaje).toBe('La celda tiene un error (#DIV/0!).');
  });

  it('un texto que empieza con = sale de la exportación como texto, no como fórmula', async () => {
    const texto = "=cmd|' /C calc'!A0";
    const contenido = await new LibroDeExcelJs().escribir({
      nombre: 'Datos',
      encabezados: ['Dato'],
      filas: [[texto]],
      instrucciones: [],
    });
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(contenido as unknown as ArrayBuffer);
    const celda = libro.worksheets[0]!.getCell('A2');

    expect(celda.type).toBe(ExcelJS.ValueType.String);
    expect(celda.value).toBe(texto);
  });
});
