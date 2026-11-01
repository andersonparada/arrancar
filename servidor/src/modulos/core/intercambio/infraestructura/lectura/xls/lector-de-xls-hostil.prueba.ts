import { describe, expect, it } from 'vitest';
import { ErrorEsperado } from '../../../../compartido/dominio/errores.js';
import { ExcelConContenidoNoPermitido } from '../../../aplicacion/errores.js';
import { ExcelAntiguoNoAdmitido, ExcelCifrado } from '../../../aplicacion/errores-de-lectura.js';
import { LectorDeXls } from '../lector-de-xls.js';
import { leerHojaDeBiff8 } from './lector-de-biff8.js';
import { extraerLibroDeCfb } from './lector-de-cfb.js';
import { cfbDePrueba } from './cfb-de-prueba.js';
import { bof, boundsheet, registroBiff, xlsDePrueba } from './xls-de-prueba.js';
import { REGISTRO } from './registros-biff.js';

const lector = new LectorDeXls();
const leer = (archivo: Buffer) => lector.leer(archivo);
const NO_LEGIBLE = 'No se pudo leer';
const LIBRE = 0xffffffff;
const FIN = 0xfffffffe;

const posicionDelSector = (id: number) => (id + 1) * 512;
const posicionEnLaFat = (archivo: Buffer, sector: number) =>
  posicionDelSector(archivo.readUInt32LE(76 + 4 * Math.floor(sector / 128))) + (sector % 128) * 4;
const directorio = (archivo: Buffer) => posicionDelSector(archivo.readUInt32LE(48));
const inicioDelLibro = (archivo: Buffer) => archivo.readUInt32LE(directorio(archivo) + 128 + 116);

/** Copia del archivo con un entero de 32 bits cambiado. */
function conEntero(archivo: Buffer, posicion: number, valor: number): Buffer {
  const copia = Buffer.from(archivo);
  copia.writeUInt32LE(valor, posicion);
  return copia;
}

const grande = () => xlsDePrueba([['a', 1]], { flujoGrande: true });
const chico = () => xlsDePrueba([['a', 1]]);

describe('lector de .xls: contenedor dañado', () => {
  it('rechaza firma, orden de bytes, versión y tamaños de sector que no son los de CFB', () => {
    const archivo = chico();
    const conByte = (posicion: number, valor: number) => {
      const copia = Buffer.from(archivo);
      copia.writeUInt16LE(valor, posicion);
      return copia;
    };

    expect(() => leer(conByte(0, 0))).toThrow(NO_LEGIBLE);
    expect(() => leer(conByte(28, 0xfeff))).toThrow(NO_LEGIBLE);
    expect(() => leer(conByte(26, 5))).toThrow(NO_LEGIBLE);
    expect(() => leer(conByte(30, 10))).toThrow(NO_LEGIBLE);
    expect(() => leer(conByte(32, 7))).toThrow(NO_LEGIBLE);
    expect(() => leer(archivo.subarray(0, 300))).toThrow(NO_LEGIBLE);
  });

  it('rechaza cuentas de sectores que no caben en el archivo', () => {
    const archivo = chico();

    for (const posicion of [44, 64, 72]) expect(() => leer(conEntero(archivo, posicion, 100_000))).toThrow(NO_LEGIBLE);
  });

  it('un ciclo en la cadena del libro, del directorio o de la mini FAT se corta pronto', () => {
    const archivo = grande();
    const miniFat = chico().readUInt32LE(60);
    const casos = [
      conEntero(archivo, posicionEnLaFat(archivo, inicioDelLibro(archivo)), inicioDelLibro(archivo)),
      conEntero(archivo, posicionEnLaFat(archivo, archivo.readUInt32LE(48)), archivo.readUInt32LE(48)),
      conEntero(chico(), posicionDelSector(miniFat), 0),
    ];

    const inicio = performance.now();
    for (const caso of casos) expect(() => leer(caso)).toThrow(NO_LEGIBLE);
    expect(performance.now() - inicio).toBeLessThan(100);
  });

  it('un ciclo en la DIFAT se corta', () => {
    const archivo = xlsDePrueba([['a']], {
      flujos: [{ nombre: '\u0005SummaryInformation', datos: Buffer.alloc(120 * 512) }],
    });
    const sector = 3;
    const ciclo = conEntero(archivo, posicionDelSector(sector) + 508, sector);
    ciclo.writeUInt32LE(110, 44);
    ciclo.writeUInt32LE(2, 72);
    ciclo.writeUInt32LE(sector, 68);

    expect(() => leer(ciclo)).toThrow(NO_LEGIBLE);
  });

  it('rechaza sectores fuera de rango, libres a mitad de cadena, cadenas cortas y un archivo truncado', () => {
    const archivo = grande();
    const inicio = inicioDelLibro(archivo);

    expect(() => leer(conEntero(archivo, 48, 0x7fffffff))).toThrow(NO_LEGIBLE);
    expect(() => leer(conEntero(archivo, posicionEnLaFat(archivo, inicio), LIBRE))).toThrow(NO_LEGIBLE);
    expect(() => leer(conEntero(archivo, posicionEnLaFat(archivo, inicio), FIN))).toThrow(NO_LEGIBLE);
    expect(() => leer(archivo.subarray(0, archivo.length - 700))).toThrow(NO_LEGIBLE);
  });

  it('rechaza un flujo que dice medir más que el archivo', () => {
    const archivo = grande();

    expect(() => leer(conEntero(archivo, directorio(archivo) + 128 + 120, 0x7fffff00))).toThrow(NO_LEGIBLE);
  });

  it.each(['_VBA_PROJECT_CUR', 'Macros', 'ObjectPool', 'MBD0000AB12', '_SX_DB_CUR'])(
    'rechaza el almacén %s',
    (nombre) => {
      const archivo = xlsDePrueba([['a']], { flujos: [{ nombre, datos: Buffer.alloc(0), tipo: 'almacen' }] });

      expect(() => leer(archivo)).toThrow(ExcelConContenidoNoPermitido);
    },
  );

  it.each(['Ctls', 'EncryptionInfo', 'VBA', 'Workbook2'])('rechaza el flujo desconocido %s', (nombre) => {
    const archivo = xlsDePrueba([['a']], { flujos: [{ nombre, datos: Buffer.from('x') }] });

    expect(() => leer(archivo)).toThrow(ExcelConContenidoNoPermitido);
  });

  it('acepta las propiedades del documento y rechaza un directorio con más de 32 entradas', () => {
    const propiedades = [
      { nombre: '\u0005SummaryInformation', datos: Buffer.alloc(300) },
      { nombre: '\u0005DocumentSummaryInformation', datos: Buffer.alloc(300) },
      { nombre: '\u0001CompObj', datos: Buffer.alloc(100) },
    ];
    const muchos = Array.from({ length: 40 }, (_, i) => ({ nombre: `Extra${i}`, datos: Buffer.alloc(0) }));

    expect(leer(xlsDePrueba([['a']], { flujos: propiedades }))).toHaveLength(1);
    expect(() => leer(xlsDePrueba([['a']], { flujos: muchos }))).toThrow(ExcelConContenidoNoPermitido);
  });

  it('un libro Excel 5/95 (flujo Book o BOF BIFF5) es demasiado antiguo; sin libro, no se puede leer', () => {
    const libro = Buffer.concat([bof(0x0005, 0x0500), registroBiff(REGISTRO.EOF)]);

    expect(() => leer(cfbDePrueba([{ nombre: 'Book', datos: libro }]))).toThrow(ExcelAntiguoNoAdmitido);
    expect(() => leer(xlsDePrueba([['a']], { versionDeBiff: 0x0500 }))).toThrow(ExcelAntiguoNoAdmitido);
    expect(() => leer(cfbDePrueba([{ nombre: '\u0005CompObj', datos: libro }]))).toThrow(ExcelConContenidoNoPermitido);
  });
});

describe('lector de .xls: contenido activo', () => {
  const nombre = (grbit: number, texto: string) => {
    const datos = Buffer.alloc(15 + texto.length);
    datos.writeUInt16LE(grbit, 0);
    datos.writeUInt8(texto.length, 3);
    datos.write(texto, 15, 'latin1');
    return registroBiff(REGISTRO.NAME, datos);
  };
  const interno = (codigo: number) => {
    const datos = Buffer.alloc(16);
    datos.writeUInt16LE(0x0020, 0);
    datos.writeUInt8(1, 3);
    datos.writeUInt8(codigo, 15);
    return registroBiff(REGISTRO.NAME, datos);
  };

  it('rechaza el libro con contraseña (FILEPASS)', () => {
    const archivo = xlsDePrueba([['a']], { globales: [registroBiff(REGISTRO.FILEPASS, Buffer.alloc(54))] });

    expect(() => leer(archivo)).toThrow(ExcelCifrado);
  });

  it.each([REGISTRO.OBJ, REGISTRO.MSODRAWING, REGISTRO.MSODRAWINGGROUP, REGISTRO.MSODRAWINGSELECTION, REGISTRO.TXO])(
    'rechaza objetos y dibujos (registro %i) en la hoja, en lo global y en otra hoja',
    (tipo) => {
      const registro = registroBiff(tipo, Buffer.alloc(10));

      expect(() => leer(xlsDePrueba([['a']], { hoja: [registro] }))).toThrow(ExcelConContenidoNoPermitido);
      expect(() => leer(xlsDePrueba([['a']], { globales: [registro] }))).toThrow(ExcelConContenidoNoPermitido);
      expect(() => leer(xlsDePrueba([['a']], { otrasHojas: [[registro]] }))).toThrow(ExcelConContenidoNoPermitido);
    },
  );

  it.each([1, 2, 6])('rechaza una hoja que no es de cálculo (tipo %i)', (tipo) => {
    const archivo = xlsDePrueba([['a']], { globales: [boundsheet(0, 'Macro1', tipo)] });

    expect(() => leer(archivo)).toThrow(ExcelConContenidoNoPermitido);
  });

  it('rechaza un BOF de gráfico o de módulo dentro de la hoja', () => {
    expect(() => leer(xlsDePrueba([['a']], { hoja: [bof(0x0020)] }))).toThrow(ExcelConContenidoNoPermitido);
    expect(() => leer(xlsDePrueba([['a']], { hoja: [bof(0x0006)] }))).toThrow(ExcelConContenidoNoPermitido);
  });

  it('rechaza Auto_Open y Auto_Close (internos o escritos) y deja pasar un nombre normal', () => {
    for (const registro of [interno(1), interno(2), nombre(0, 'Auto_Open'), nombre(0, 'AUTO_CLOSE')]) {
      expect(() => leer(xlsDePrueba([['a']], { globales: [registro] }))).toThrow(ExcelConContenidoNoPermitido);
    }
    expect(leer(xlsDePrueba([['a']], { globales: [nombre(0, 'MiRango'), interno(5)] }))).toHaveLength(1);
  });
});

describe('lector de .xls: registros y celdas dañados', () => {
  it('rechaza un registro de más de 8,224 bytes y uno que se sale del flujo', () => {
    const largo = Buffer.alloc(8225);
    const truncado = Buffer.from([0x42, 0x00, 0x64, 0x00]);

    expect(() => leer(xlsDePrueba([['a']], { globales: [registroBiff(0x1234, largo)] }))).toThrow(NO_LEGIBLE);
    expect(() => leer(xlsDePrueba([['a']], { hoja: [truncado] }))).toThrow(NO_LEGIBLE);
  });

  it('rechaza una tabla de cadenas con una cuenta imposible o una cadena demasiado larga', () => {
    const sst = (unicas: number, cadena: number[] = []) => {
      const datos = Buffer.alloc(8);
      datos.writeUInt32LE(unicas, 4);
      return registroBiff(REGISTRO.SST, Buffer.concat([datos, Buffer.from(cadena)]));
    };

    expect(() => leer(xlsDePrueba([], { globales: [sst(0xffffffff)] }))).toThrow(NO_LEGIBLE);
    expect(() => leer(xlsDePrueba([], { globales: [sst(200_001)] }))).toThrow(NO_LEGIBLE);
    expect(() => leer(xlsDePrueba([], { globales: [sst(50)] }))).toThrow(NO_LEGIBLE);
    expect(() => leer(xlsDePrueba([], { globales: [sst(1, [0x00, 0xa0, 0x00])] }))).toThrow(NO_LEGIBLE);
    expect(() => leer(xlsDePrueba([], { globales: [sst(1, [0x05, 0x00, 0x00, 0x61])] }))).toThrow(NO_LEGIBLE);
  });

  it('rechaza una segunda tabla de cadenas', () => {
    const otra = registroBiff(REGISTRO.SST, Buffer.alloc(8));

    expect(() => leer(xlsDePrueba([['a']], { globales: [otra] }))).toThrow(NO_LEGIBLE);
  });

  it('rechaza MULRK y MULBLANK cuya columna final no cuadra con su largo', () => {
    const mulrk = Buffer.alloc(4 + 12 + 2);
    mulrk.writeUInt16LE(5, 16);
    const mulblank = Buffer.alloc(4 + 4 + 2);
    mulblank.writeUInt16LE(9, 8);

    expect(() => leer(xlsDePrueba([], { hoja: [registroBiff(REGISTRO.MULRK, mulrk)] }))).toThrow(NO_LEGIBLE);
    expect(() => leer(xlsDePrueba([], { hoja: [registroBiff(REGISTRO.MULBLANK, mulblank)] }))).toThrow(NO_LEGIBLE);
  });

  it('rechaza celdas con datos demasiado cortos', () => {
    for (const tipo of [REGISTRO.NUMBER, REGISTRO.RK, REGISTRO.LABELSST, REGISTRO.LABEL, REGISTRO.FORMULA]) {
      expect(() => leer(xlsDePrueba([], { hoja: [registroBiff(tipo, Buffer.alloc(5))] }))).toThrow(NO_LEGIBLE);
    }
  });

  it('un libro sin hoja que empiece donde dice el BOUNDSHEET no se puede leer', () => {
    const solo = Buffer.concat([bof(0x0005), registroBiff(REGISTRO.EOF)]);

    expect(() => leer(cfbDePrueba([{ nombre: 'Workbook', datos: solo }]))).toThrow(NO_LEGIBLE);
  });
});

/** Generador pseudoaleatorio con semilla, para que una falla se pueda repetir. */
function aleatorio(semilla: number): () => number {
  let estado = semilla;
  return () => {
    estado = (estado + 0x6d2b79f5) | 0;
    let t = Math.imul(estado ^ (estado >>> 15), 1 | estado);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Se prueba por dentro, sin la red de seguridad de `LectorDeXls`: ninguna mutación debe romper con un error propio de JavaScript. */
describe('lector de .xls: archivos mutados', () => {
  it('500 mutaciones solo dan un resultado o un error esperado, cada una en menos de un segundo', () => {
    const textos = Array.from({ length: 30 }, (_, i) => `Cadena ñ€ ${i}`);
    const bases = [
      xlsDePrueba([textos, [1, 2.5, { formula: 'x' }]], { corteDeLasCadenas: 40, cambiarAncho: true }),
      xlsDePrueba([textos], { flujoGrande: true }),
    ];
    const azar = aleatorio(2026);
    const inesperados: string[] = [];
    let lentas = 0;

    for (let i = 0; i < 500; i++) {
      const base = bases[i % bases.length] as Buffer;
      const mutado = Buffer.from(base);
      for (let k = 0; k < 1 + Math.floor(azar() * 8); k++) {
        const zona = azar() < 0.5 ? 1100 : mutado.length;
        mutado[Math.floor(azar() * Math.min(zona, mutado.length))] = Math.floor(azar() * 256);
      }
      const inicio = performance.now();
      try {
        leerHojaDeBiff8(extraerLibroDeCfb(mutado));
      } catch (error) {
        if (!(error instanceof ErrorEsperado)) inesperados.push(String(error));
      }
      if (performance.now() - inicio > 1000) lentas++;
    }

    expect(inesperados).toEqual([]);
    expect(lentas).toBe(0);
  });
});
