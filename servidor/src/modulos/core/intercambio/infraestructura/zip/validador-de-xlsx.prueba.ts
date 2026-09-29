import { describe, expect, it } from 'vitest';
import {
  ArchivoNoEsExcel,
  ExcelConContenidoNoPermitido,
  ExcelDemasiadoGrandeAlDescomprimir,
} from '../../aplicacion/errores.js';
import { LibroDeExcelJs } from '../libro-de-excel.exceljs.js';
import { ValidadorDeXlsx } from './validador-de-xlsx.js';
import { armarZipDePrueba, excelDePrueba, parteDeCeros, tiposConMacros } from './zip-de-prueba.js';

const validador = new ValidadorDeXlsx();
const libro = new LibroDeExcelJs();
const parteChica = (nombre: string) => ({ nombre, contenido: Buffer.from('x') });

describe('validador de xlsx', () => {
  it('deja pasar un Excel normal y exceljs lo sigue leyendo', async () => {
    const excel = await libro.escribir({
      nombre: 'Animales',
      encabezados: ['Arete'],
      filas: [['A-001']],
      instrucciones: [['Nota']],
    });

    const leido = await libro.leer(excel);

    expect(leido.encabezados).toEqual(['Arete']);
    expect(leido.filas).toEqual([{ numero: 2, celdas: ['A-001'] }]);
  });

  it('rechaza una parte que al inflarse pasa del tope sin disparar la memoria', () => {
    const bomba = excelDePrueba([parteDeCeros('xl/worksheets/sheet1.xml', 30)]);
    const antes = process.memoryUsage().rss;

    expect(bomba.length).toBeLessThan(100 * 1024);
    expect(() => validador.sanear(bomba)).toThrow(ExcelDemasiadoGrandeAlDescomprimir);
    expect(process.memoryUsage().rss - antes).toBeLessThan(200 * 1024 * 1024);
  });

  it('rechaza varias partes que juntas pasan de 50 MB', () => {
    const partes = [1, 2, 3].map((n) => parteDeCeros(`xl/parte${n}.xml`, 20));

    expect(() => validador.sanear(excelDePrueba(partes))).toThrow(ExcelDemasiadoGrandeAlDescomprimir);
  });

  it('no se deja engañar por un tamaño declarado pequeño', () => {
    const mentira = { ...parteDeCeros('xl/worksheets/sheet1.xml', 30), tamanoDeclarado: 10 };

    expect(() => validador.sanear(excelDePrueba([mentira]))).toThrow(ExcelDemasiadoGrandeAlDescomprimir);
  });

  it('rechaza un tamaño declarado que no coincide con el real', () => {
    const mentira = { nombre: 'xl/a.xml', contenido: Buffer.from('abcdef'), tamanoDeclarado: 2 };

    expect(() => validador.sanear(excelDePrueba([mentira]))).toThrow(ArchivoNoEsExcel);
  });

  it('rechaza un Excel con macros (.xlsm)', () => {
    expect(() => validador.sanear(excelDePrueba([], tiposConMacros()))).toThrow(ExcelConContenidoNoPermitido);
  });

  it.each(['xl/vbaProject.bin', 'xl/embeddings/objeto1.bin', 'xl/externalLinks/externalLink1.xml'])(
    'rechaza la parte %s',
    (nombre) => {
      expect(() => validador.sanear(excelDePrueba([parteChica(nombre)]))).toThrow(ExcelConContenidoNoPermitido);
    },
  );

  it('rechaza lo que no es un zip', () => {
    expect(() => validador.sanear(Buffer.from('esto es texto'))).toThrow(ArchivoNoEsExcel);
    expect(() => validador.sanear(Buffer.from('PK\u0003\u0004 pero cortado'))).toThrow(ArchivoNoEsExcel);
  });

  it('rechaza un zip con más de 100 entradas', () => {
    const muchas = Array.from({ length: 100 }, (_, n) => parteChica(`xl/p${n}.xml`));

    expect(() => validador.sanear(excelDePrueba(muchas))).toThrow(ArchivoNoEsExcel);
  });

  it('rechaza un zip sin [Content_Types].xml de hoja normal', () => {
    expect(() => validador.sanear(armarZipDePrueba([parteChica('xl/a.xml')]))).toThrow(ArchivoNoEsExcel);
    expect(() => validador.sanear(excelDePrueba([], Buffer.from('<Types/>')))).toThrow(ArchivoNoEsExcel);
  });

  it('rechaza dos entradas con el mismo nombre', () => {
    expect(() => validador.sanear(excelDePrueba([parteChica('xl/a.xml'), parteChica('xl/a.xml')]))).toThrow(
      ArchivoNoEsExcel,
    );
  });
});
