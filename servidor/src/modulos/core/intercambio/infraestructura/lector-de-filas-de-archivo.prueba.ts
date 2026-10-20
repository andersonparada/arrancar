import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { ArchivoDemasiadoGrande, ArchivoNoEsExcel, DemasiadasFilas } from '../aplicacion/errores.js';
import {
  ArchivoConCeldasDemasiadoGrandes,
  ArchivoDeTextoNoAdmitido,
  EncabezadosNoEncontrados,
  ExcelAntiguoNoAdmitido,
} from '../aplicacion/errores-de-lectura.js';
import { LectorDeFilasDeArchivo } from './lector-de-filas-de-archivo.js';
import { excelDePrueba, parteDeCeros } from './zip/zip-de-prueba.js';

const BOM = String.fromCharCode(0xfeff);
const lector = new LectorDeFilasDeArchivo();
const ESPERADOS = ['Número de autorización', 'Serie', 'Total'];
const leer = (contenido: Buffer | string) => lector.leerFilas(Buffer.from(contenido), ESPERADOS);

async function xlsx(filas: ExcelJS.CellValue[][]): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  libro.addWorksheet('Datos').addRows(filas);
  return Buffer.from(await libro.xlsx.writeBuffer());
}

describe('lector de filas: xlsx', () => {
  it('ubica los encabezados bajo filas de título y entrega todo como texto', async () => {
    const archivo = await xlsx([
      ['Reporte de la SAT'],
      [],
      ['Numero de Autorizacion', 'Serie', 'Total', 'Extra'],
      ['ABC-1', 'A', 12.5, new Date(Date.UTC(2026, 9, 5))],
      [{ formula: '1+1', result: 2 }, 'B', 7],
    ]);

    const resultado = await leer(archivo);

    expect(resultado.formato).toBe('xlsx');
    expect(resultado.filaDeEncabezados).toBe(3);
    expect(resultado.reconocidos).toEqual(ESPERADOS);
    expect(resultado.filas.map((fila) => fila.numero)).toEqual([4, 5]);
  });

  it('devuelve filas, reconocidos y no reconocidos', async () => {
    const archivo = await xlsx([
      ['Número de autorización', 'Serie', 'Total', 'Extra'],
      ['ABC-1', 'A', 12.5, new Date(Date.UTC(2026, 9, 5))],
      [{ formula: '1+1', result: 2 }, 'B', 7],
    ]);

    const resultado = await leer(archivo);

    expect(resultado.reconocidos).toEqual(ESPERADOS);
    expect(resultado.noReconocidos).toEqual(['Extra']);
    expect(resultado.filas).toEqual([
      { numero: 2, celdas: ['ABC-1', 'A', '12.5', '2026-10-05'] },
      { numero: 3, celdas: ['2', 'B', '7', ''] },
    ]);
  });

  it('una fórmula sin valor calculado llega como celda vacía', async () => {
    const archivo = await xlsx([ESPERADOS, ['x', 'y', { formula: '1+1' } as ExcelJS.CellFormulaValue]]);

    expect((await leer(archivo)).filas[0]?.celdas).toEqual(['x', 'y', '']);
  });

  it('una bomba zip se rechaza por el validador', async () => {
    const bomba = excelDePrueba([parteDeCeros('xl/worksheets/sheet1.xml', 30)]);

    await expect(leer(bomba)).rejects.toThrow('demasiado grande');
  });

  it('no pasa de 5 MB aunque la extensión diga otra cosa', async () => {
    await expect(leer(Buffer.alloc(5 * 1024 * 1024 + 1, 0x61))).rejects.toThrow(ArchivoDemasiadoGrande);
  });
});

describe('lector de filas: CSV', () => {
  const encabezado = 'Número de autorización,Serie,Total';

  it('lee coma, punto y coma y tabulador', async () => {
    for (const separador of [',', ';', '\t']) {
      const texto = [encabezado, 'A1,B,10'].map((linea) => linea.replaceAll(',', separador)).join('\n');
      expect((await leer(texto)).filas[0]?.celdas).toEqual(['A1', 'B', '10']);
    }
  });

  it('quita el BOM y entiende comillas, comillas dobladas y saltos dentro de comillas', async () => {
    const texto = `${BOM}${encabezado}\r\n"A,1","di ""hola""\nmundo",10\r\n`;

    const resultado = await leer(texto);

    expect(resultado.reconocidos).toEqual(ESPERADOS);
    expect(resultado.filas).toEqual([{ numero: 2, celdas: ['A,1', 'di "hola"\nmundo', '10'] }]);
  });

  it('lee Latin-1 (Windows-1252) cuando no es UTF-8 válido', async () => {
    const latin1 = Buffer.from('Número de autorización;Serie;Total;Nota\nA1;B;10;Año\n', 'latin1');

    const resultado = await leer(latin1);

    expect(resultado.reconocidos).toEqual(ESPERADOS);
    expect(resultado.filas[0]?.celdas).toContain('Año');
  });

  it('omite líneas vacías pero conserva el número de línea', async () => {
    const resultado = await leer(`${encabezado}\n\nA1,B,10\n`);

    expect(resultado.filas.map((fila) => fila.numero)).toEqual([3]);
  });

  it('no interpreta fórmulas: llegan como texto', async () => {
    const resultado = await leer(`${encabezado}\n=1+1,@x,10\n`);

    expect(resultado.filas[0]?.celdas).toEqual(['=1+1', '@x', '10']);
  });

  it('un CSV gigante se rechaza por tamaño', async () => {
    await expect(leer(`${encabezado}\n${'a,b,1\n'.repeat(1_000_000)}`)).rejects.toThrow(ArchivoDemasiadoGrande);
  });

  it('más de 10,000 filas se rechaza', async () => {
    await expect(leer(`${encabezado}\n${'a,b,1\n'.repeat(10_001)}`)).rejects.toThrow(DemasiadasFilas);
  });

  it('una celda de más de 4,000 caracteres se rechaza', async () => {
    await expect(leer(`${encabezado}\nA,${'x'.repeat(4_001)},1`)).rejects.toThrow(ArchivoConCeldasDemasiadoGrandes);
  });

  it('más de 200 columnas se rechaza', async () => {
    await expect(leer(`${encabezado}\n${','.repeat(250)}`)).rejects.toThrow(ArchivoConCeldasDemasiadoGrandes);
  });

  it('unas comillas sin cerrar no se pueden leer', async () => {
    await expect(leer(`${encabezado}\n"abierta,B,1`)).rejects.toThrow('No se pudo leer');
  });

  it('sin una fila de encabezados esperados avisa cuáles se esperaban', async () => {
    const error = await leer('uno,dos\n1,2').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(EncabezadosNoEncontrados);
    expect((error as EncabezadosNoEncontrados).detalles).toEqual({ esperados: ESPERADOS });
  });

  it('solo busca los encabezados en las primeras 20 filas', async () => {
    const titulos = Array.from({ length: 20 }, (_, i) => `titulo ${i}`).join('\n');

    await expect(leer(`${titulos}\n${encabezado}\n`)).rejects.toThrow(EncabezadosNoEncontrados);
  });
});

describe('lector de filas: formatos que no se aceptan', () => {
  it('rechaza un .xls (BIFF) aunque se llame .xlsx', async () => {
    const biff = Buffer.concat([Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]), Buffer.alloc(512)]);

    await expect(leer(biff)).rejects.toThrow(ExcelAntiguoNoAdmitido);
  });

  it.each([
    '<html><body><table></table></body></html>',
    '  \n<?xml version="1.0"?><Workbook/>',
    '<table><tr/></table>',
  ])('rechaza HTML o XML disfrazados: %s', async (texto) => {
    await expect(leer(texto)).rejects.toThrow(ArchivoDeTextoNoAdmitido);
  });

  it('rechaza HTML con BOM', async () => {
    await expect(leer(`${BOM}<html></html>`)).rejects.toThrow(ArchivoDeTextoNoAdmitido);
  });

  it('rechaza binarios con bytes NUL, UTF-16 y archivos vacíos', async () => {
    await expect(leer(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x01]))).rejects.toThrow(ArchivoNoEsExcel);
    await expect(leer(Buffer.from('a,b\n1,2', 'utf16le'))).rejects.toThrow(ArchivoNoEsExcel);
    await expect(leer(Buffer.alloc(0))).rejects.toThrow(ArchivoNoEsExcel);
  });
});
