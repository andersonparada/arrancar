import { describe, expect, it } from 'vitest';
import { filtrarOpciones, indiceDeOpcionElegida, moverIndiceActivo, normalizarTexto } from './busqueda-de-opciones';

describe('normalizarTexto', () => {
  it('quita tildes y pasa a minúsculas', () => {
    expect(normalizarTexto('Peña')).toBe('pena');
    expect(normalizarTexto('MÉXICO')).toBe('mexico');
    expect(normalizarTexto('árbol')).toBe('arbol');
  });
});

describe('filtrarOpciones', () => {
  const opciones = [
    { valor: 1, texto: 'Peña Nieto' },
    { valor: 2, texto: 'García López' },
    { valor: 3, texto: 'Martínez' },
  ];

  it('encuentra por texto contenido, sin distinguir mayúsculas ni tildes', () => {
    expect(filtrarOpciones(opciones, 'pena').map((o) => o.valor)).toEqual([1]);
    expect(filtrarOpciones(opciones, 'GARCIA').map((o) => o.valor)).toEqual([2]);
    expect(filtrarOpciones(opciones, 'martinez').map((o) => o.valor)).toEqual([3]);
  });

  it('sin texto de búsqueda devuelve todas las opciones', () => {
    expect(filtrarOpciones(opciones, '')).toEqual(opciones);
    expect(filtrarOpciones(opciones, '   ')).toEqual(opciones);
  });

  it('sin coincidencias devuelve una lista vacía', () => {
    expect(filtrarOpciones(opciones, 'zzz')).toEqual([]);
  });
});

describe('moverIndiceActivo', () => {
  it('avanza y retrocede dentro de la lista', () => {
    expect(moverIndiceActivo(0, 3, 1)).toBe(1);
    expect(moverIndiceActivo(1, 3, -1)).toBe(0);
  });

  it('da la vuelta en los bordes', () => {
    expect(moverIndiceActivo(2, 3, 1)).toBe(0);
    expect(moverIndiceActivo(0, 3, -1)).toBe(2);
  });

  it('con la lista vacía no hay nada que activar', () => {
    expect(moverIndiceActivo(-1, 0, 1)).toBe(-1);
  });
});

describe('indiceDeOpcionElegida', () => {
  const opciones = [
    { valor: 'a', texto: 'A' },
    { valor: 'b', texto: 'B' },
  ];

  it('encuentra el índice del valor elegido', () => {
    expect(indiceDeOpcionElegida(opciones, 'b')).toBe(1);
  });

  it('devuelve -1 si nada coincide', () => {
    expect(indiceDeOpcionElegida(opciones, 'c')).toBe(-1);
  });
});
