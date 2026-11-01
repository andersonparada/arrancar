import { describe, expect, it } from 'vitest';
import { DemasiadasFilas } from '../../../aplicacion/errores.js';
import { ArchivoConCeldasDemasiadoGrandes } from '../../../aplicacion/errores-de-lectura.js';
import { LectorDeFilasDeArchivo } from '../../lector-de-filas-de-archivo.js';
import { LectorDeXls } from '../lector-de-xls.js';
import { detectarFormato } from '../detectar-formato.js';
import { celdaDeCadena, celdaNumero, registroBiff, xlsDePrueba, type CeldaDePrueba } from './xls-de-prueba.js';
import { REGISTRO } from './registros-biff.js';

const lector = new LectorDeXls();
const ENCABEZADOS = ['Número de autorización', 'Serie', 'Total'];

const leer = (archivo: Buffer) => lector.leer(archivo);
const celdasDe = (archivo: Buffer) => leer(archivo).map((fila) => fila.celdas);

describe('lector de .xls: lo básico', () => {
  it('se detecta por la firma OLE2, no por el nombre', () => {
    expect(detectarFormato(xlsDePrueba([['a']]))).toEqual({ formato: 'xls' });
  });

  it('lee textos, números y celdas vacías de la primera hoja con el número de fila de Excel', () => {
    const archivo = xlsDePrueba([['Título'], [], ['Serie', 12.5, null, 'Fin'], [null, 7]]);

    expect(leer(archivo)).toEqual([
      { numero: 1, celdas: ['Título', '', '', ''] },
      { numero: 3, celdas: ['Serie', '12.5', '', 'Fin'] },
      { numero: 4, celdas: ['', '7', '', ''] },
    ]);
  });

  it('lee igual con el libro chico (mini flujo), grande (sectores) y con sectores de 4096', () => {
    const filas: CeldaDePrueba[][] = [['uno', 'dos', 3]];
    const esperado = [{ numero: 1, celdas: ['uno', 'dos', '3'] }];

    expect(leer(xlsDePrueba(filas))).toEqual(esperado);
    expect(leer(xlsDePrueba(filas, { flujoGrande: true }))).toEqual(esperado);
    expect(leer(xlsDePrueba(filas, { tamanoDeSector: 4096 }))).toEqual(esperado);
    expect(leer(xlsDePrueba(filas, { tamanoDeSector: 4096, flujoGrande: true }))).toEqual(esperado);
  });

  it('recorta espacios, como el lector de .xlsx', () => {
    expect(celdasDe(xlsDePrueba([['  A  ', 1]]))).toEqual([['A', '1']]);
  });

  it('lee textos con tildes, ñ y letras fuera de Latin-1', () => {
    const textos = ['Peñafiel y Compañía, S.A.', 'Ñandú', 'Precio € 5 Ω'];

    expect(celdasDe(xlsDePrueba([textos]))).toEqual([textos]);
  });

  it('un número guardado con muchos decimales llega sin ruido', () => {
    expect(celdasDe(xlsDePrueba([[1234.56, 0.000001, 100, -3.5]]))).toEqual([['1234.56', '0.000001', '100', '-3.5']]);
  });

  it('una fórmula entrega su valor guardado, número o texto, sin evaluarla', () => {
    const archivo = xlsDePrueba([[{ formula: 42 }, { formula: 'texto guardado' }, 'x']]);

    expect(celdasDe(archivo)).toEqual([['42', 'texto guardado', 'x']]);
  });

  it('lee números RK (entero, centésimas y decimal) y MULRK', () => {
    const rk = (valor: number) => {
      const datos = Buffer.alloc(10);
      datos.writeUInt32LE(valor, 6);
      return datos;
    };
    const celda = (columna: number, valor: number) => {
      const datos = rk(valor);
      datos.writeUInt16LE(0, 0);
      datos.writeUInt16LE(columna, 2);
      return registroBiff(REGISTRO.RK, datos);
    };
    const multiple = Buffer.alloc(4 + 12 + 2);
    multiple.writeUInt16LE(1, 0);
    multiple.writeUInt16LE(0, 2);
    multiple.writeUInt32LE((5 << 2) | 2, 6);
    multiple.writeUInt32LE((1234 << 2) | 3, 12);
    multiple.writeUInt16LE(1, 16);
    const hoja = [celda(0, (7 << 2) | 2), celda(1, (250 << 2) | 3), registroBiff(REGISTRO.MULRK, multiple)];

    expect(celdasDe(xlsDePrueba([], { hoja }))).toEqual([
      ['7', '2.5'],
      ['5', '12.34'],
    ]);
  });

  it('solo lee la primera hoja', () => {
    const otra = [celdaNumero(0, 0, 99)];

    expect(celdasDe(xlsDePrueba([['primera']], { otrasHojas: [otra] }))).toEqual([['primera']]);
  });

  it('una celda de cadena apunta a la tabla de cadenas compartidas', () => {
    expect(celdasDe(xlsDePrueba([['a', 'b', 'a']]))).toEqual([['a', 'b', 'a']]);
    const huerfana = xlsDePrueba([], { hoja: [celdaDeCadena(0, 0, 5)] });

    expect(() => leer(huerfana)).toThrow('No se pudo leer');
  });
});

describe('lector de .xls: cadenas partidas en CONTINUE', () => {
  it('une las cadenas que cruzan cortes, con cambio entre comprimido y UTF-16', () => {
    const textos = Array.from({ length: 40 }, (_, i) => `Peñafiel ${i} ${'ñ€Ω'.repeat(i % 5)} compañía`);
    const archivo = xlsDePrueba([textos], { corteDeLasCadenas: 37, cambiarAncho: true });

    expect(celdasDe(archivo)).toEqual([textos]);
  });

  it('une las cadenas con cortes sin cambiar de ancho', () => {
    const textos = Array.from({ length: 30 }, (_, i) => `Año ${i} ${'€'.repeat(i % 7)} fin`);

    expect(celdasDe(xlsDePrueba([textos], { corteDeLasCadenas: 23 }))).toEqual([textos]);
  });
});

describe('lector de .xls: con el lector de filas del motor', () => {
  const motor = new LectorDeFilasDeArchivo();

  it('ubica los encabezados bajo filas de título y entrega todo como texto', async () => {
    const archivo = xlsDePrueba([['Reporte'], [], ['Numero de Autorizacion', 'Serie', 'Total'], ['ABC-1', 'A', 12.5]]);

    const resultado = await motor.leerFilas(archivo, ENCABEZADOS);

    expect(resultado.formato).toBe('xls');
    expect(resultado.filaDeEncabezados).toBe(3);
    expect(resultado.filas).toEqual([{ numero: 4, celdas: ['ABC-1', 'A', '12.5'] }]);
  });

  it('10,000 filas de 33 columnas con CONTINUE se leen en un tiempo razonable', async () => {
    const encabezados = Array.from({ length: 33 }, (_, i) => `Columna ${i}`);
    const filas: CeldaDePrueba[][] = [['Número de autorización', 'Serie', 'Total', ...encabezados.slice(3)]];
    for (let i = 0; i < 9_999; i++) {
      filas.push([`UUID-${i}`, `Nombre ñandú ${i}`, i + 0.5, ...Array.from({ length: 20 }, (_, j) => j * 1.5)]);
    }
    const archivo = xlsDePrueba(filas);
    expect(archivo.length).toBeLessThan(5 * 1024 * 1024);

    const inicio = performance.now();
    const resultado = await motor.leerFilas(archivo, ENCABEZADOS);
    const milisegundos = performance.now() - inicio;

    expect(resultado.filas).toHaveLength(9_999);
    expect(resultado.filas.at(-1)?.celdas.slice(0, 3)).toEqual(['UUID-9998', 'Nombre ñandú 9998', '9998.5']);
    expect(milisegundos).toBeLessThan(2_000);
  });

  it('más de 10,000 filas se rechaza', async () => {
    const filas: CeldaDePrueba[][] = Array.from({ length: 10_001 }, () => [1]);

    await expect(motor.leerFilas(xlsDePrueba(filas), ENCABEZADOS)).rejects.toThrow(DemasiadasFilas);
  });

  it('más de 200 columnas se rechaza, 200 pasan', async () => {
    const con = (columnas: number): CeldaDePrueba[][] => [[...Array<null>(columnas - 1).fill(null), 5]];

    await expect(motor.leerFilas(xlsDePrueba(con(201)), ENCABEZADOS)).rejects.toThrow(ArchivoConCeldasDemasiadoGrandes);
    expect(leer(xlsDePrueba(con(200)))[0]?.celdas).toHaveLength(200);
  });

  it('una celda de más de 4,000 caracteres se rechaza', async () => {
    const archivo = xlsDePrueba([['x'.repeat(4_001)]]);

    await expect(motor.leerFilas(archivo, ENCABEZADOS)).rejects.toThrow(ArchivoConCeldasDemasiadoGrandes);
  });
});
