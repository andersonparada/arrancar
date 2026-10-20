import { describe, expect, it } from 'vitest';
import { COLUMNAS_DE_DINERO, type FilaDelLibro } from './fila-del-libro.js';
import { foliosQueGasta, paginarLibro } from './paginacion-del-libro.js';

function filaDe(numero: number, total: number): FilaDelLibro {
  const montos = Object.fromEntries(COLUMNAS_DE_DINERO.map((columna) => [columna, 0]));
  return {
    ...montos,
    documentoId: `d${numero}`,
    proveedorId: 'p',
    numeroDeFila: numero,
    fecha: '2026-10-01',
    tipoDte: 'FACT',
    serie: 'A',
    numero: String(numero),
    nit: null,
    nombre: 'Proveedor',
    motivo: null,
    siglaDelMotivo: null,
    bienes: total,
    total,
  } as FilaDelLibro;
}

const filas = (cantidad: number) => Array.from({ length: cantidad }, (_, i) => filaDe(i + 1, 100 * (i + 1)));

describe('paginarLibro', () => {
  it('un libro sin filas tiene una hoja vacía y la del resumen', () => {
    const libro = paginarLibro([], 4);

    expect(libro.paginas).toHaveLength(1);
    expect(libro.paginas[0]).toMatchObject({ filas: [], vienen: null, esUltima: true });
    expect(libro.paginas[0]!.acumulado.total).toBe(0);
    expect(libro.hojas).toBe(2);
  });

  it('con exactamente las filas de una hoja no sobra una hoja vacía', () => {
    const libro = paginarLibro(filas(4), 4);

    expect(libro.paginas).toHaveLength(1);
    expect(libro.hojas).toBe(2);
    expect(libro.paginas[0]!.esUltima).toBe(true);
  });

  it('una fila más abre otra hoja', () => {
    expect(paginarLibro(filas(5), 4).paginas).toHaveLength(2);
  });

  it('cada hoja trae lo que vienen de las anteriores y lleva lo acumulado', () => {
    const [primera, segunda, tercera] = paginarLibro(filas(10), 4).paginas;

    expect(primera!.vienen).toBeNull();
    expect(primera!.acumulado.total).toBe(100 + 200 + 300 + 400);
    expect(segunda!.vienen).toEqual(primera!.acumulado);
    expect(segunda!.acumulado.total).toBe(100 * (1 + 2 + 3 + 4 + 5 + 6 + 7 + 8));
    expect(tercera!.vienen).toEqual(segunda!.acumulado);
    expect(tercera!.acumulado.total).toBe(100 * 55);
    expect([primera, segunda, tercera].map((pagina) => pagina!.esUltima)).toEqual([false, false, true]);
  });

  it('suma todas las columnas de dinero, con signo', () => {
    const nota = { ...filaDe(2, -50), bienes: -50 };
    const [pagina] = paginarLibro([filaDe(1, 150), nota], 4).paginas;

    expect(pagina!.acumulado).toMatchObject({ total: 100, bienes: 100, servicios: 0 });
  });

  it('la cantidad de hojas depende solo de cuántas filas son', () => {
    const corta = filas(70).map((fila) => ({ ...fila, nombre: 'x' }));
    const larga = filas(70).map((fila) => ({ ...fila, nombre: 'x'.repeat(20000) }));

    expect(paginarLibro(corta).hojas).toBe(paginarLibro(larga).hojas);
    expect(paginarLibro(corta).hojas).toBe(foliosQueGasta(70));
  });
});

describe('foliosQueGasta', () => {
  it('cuenta las hojas de filas más la del resumen', () => {
    expect(foliosQueGasta(0)).toBe(2);
    expect(foliosQueGasta(1)).toBe(2);
    expect(foliosQueGasta(32)).toBe(2);
    expect(foliosQueGasta(33)).toBe(3);
    expect(foliosQueGasta(5000)).toBe(Math.ceil(5000 / 32) + 1);
  });

  it('coincide con las hojas de paginarLibro', () => {
    for (const cantidad of [0, 1, 31, 32, 33, 64, 65, 100]) {
      expect(foliosQueGasta(cantidad)).toBe(paginarLibro(filas(cantidad)).hojas);
    }
  });
});
