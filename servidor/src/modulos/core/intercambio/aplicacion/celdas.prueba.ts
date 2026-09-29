import { describe, expect, it } from 'vitest';
import { escribirCelda, leerCelda } from './celdas.js';
import type { Columna } from './columnas.js';
import { CeldaConProblema } from './puertos/libro-de-excel.js';

const columna = <Tipo extends Columna['tipo']>(tipo: Tipo, extra: object = {}) =>
  ({ clave: 'dato', titulo: 'Dato', requerido: false, tipo, ...extra }) as Columna;

const SEXO = columna('lista', { opciones: { macho: 'Macho', hembra: 'Hembra' } });
const POTRERO = columna('referencia', { campoDeNombre: 'datoNombre', opciones: async () => [] });

describe('leer una celda', () => {
  it('las fechas se aceptan como fecha de Excel o escritas a mano, sin correr el día', () => {
    expect(leerCelda(new Date(Date.UTC(2024, 2, 15)), columna('fecha'))).toEqual({ valor: '2024-03-15' });
    expect(leerCelda('15/03/2024', columna('fecha'))).toEqual({ valor: '2024-03-15' });
    expect(leerCelda('2024-03-15', columna('fecha'))).toEqual({ valor: '2024-03-15' });
    expect(leerCelda('31/02/2024', columna('fecha'))).toEqual({ error: 'Esa fecha no existe.' });
  });

  it('los números aceptan separador de miles; los decimales viajan como texto', () => {
    expect(leerCelda('1,250', columna('entero'))).toEqual({ valor: 1250 });
    expect(leerCelda(12.5, columna('decimal'))).toEqual({ valor: '12.5' });
    expect(leerCelda('doce', columna('decimal'))).toEqual({ error: 'Escriba un número.' });
  });

  it('las listas aceptan su texto o su valor, sin importar tildes ni mayúsculas', () => {
    expect(leerCelda('HEMBRA', SEXO)).toEqual({ valor: 'hembra' });
    expect(leerCelda('Toro', SEXO)).toEqual({ error: 'Use una de estas opciones: Macho, Hembra.' });
  });

  it('sí/no entiende las formas comunes', () => {
    expect(['Sí', 'si', 'X'].map((celda) => leerCelda(celda, columna('siNo')))).toEqual(Array(3).fill({ valor: true }));
    expect(leerCelda('No', columna('siNo'))).toEqual({ valor: false });
  });

  it('las referencias se buscan por nombre', () => {
    const opciones = [
      { id: 'p1', nombre: 'La Ceiba' },
      { id: 'p2', nombre: 'El Roble' },
      { id: 'p3', nombre: 'El Roble' },
    ];

    expect(leerCelda('la ceiba', POTRERO, opciones)).toEqual({ valor: 'p1' });
    expect(leerCelda('El Roble', POTRERO, opciones)).toEqual({ error: 'Hay varios con el nombre "El Roble" en Dato.' });
    expect(leerCelda('Las Flores', POTRERO, opciones)).toEqual({ error: 'No existe "Las Flores" en Dato.' });
  });

  it('las referencias con código también se buscan por su código', () => {
    const opciones = [
      { id: 'l1', nombre: 'Finca Norte', codigo: 'FN' },
      { id: 'l2', nombre: 'Planta', codigo: 'PL-1' },
    ];

    expect(leerCelda('fn', POTRERO, opciones)).toEqual({ valor: 'l1' });
    expect(leerCelda('Planta', POTRERO, opciones)).toEqual({ valor: 'l2' });
  });

  it('una celda vacía es nula, salvo que el dato sea obligatorio', () => {
    expect(leerCelda('  ', columna('texto'))).toEqual({ valor: null });
    expect(leerCelda(null, { ...columna('texto'), requerido: true })).toEqual({ error: 'Falta este dato.' });
  });
});

describe('escribir una celda', () => {
  it('se escribe en el mismo formato que se acepta al importar', () => {
    const registro = { dato: 'hembra', datoNombre: 'La Ceiba' };

    expect(escribirCelda(registro, SEXO)).toBe('Hembra');
    expect(escribirCelda(registro, POTRERO)).toBe('La Ceiba');
    expect(escribirCelda({ dato: true }, columna('siNo'))).toBe('Sí');
    expect(escribirCelda({ dato: '2024-03-15' }, columna('fecha'))).toEqual(new Date(Date.UTC(2024, 2, 15)));
  });
});

describe('celdas con problema del Excel', () => {
  it('el mensaje de la celda sale como error de su columna', () => {
    const celda = new CeldaConProblema('La celda tiene un error (#REF!).');

    expect(leerCelda(celda, columna('texto'))).toEqual({ error: 'La celda tiene un error (#REF!).' });
  });
});
