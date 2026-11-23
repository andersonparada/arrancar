import { describe, expect, it } from 'vitest';
import { foliosQueGasta, paginarConSubtotales, type AcumuladorDeSubtotales } from './paginacion-con-subtotales.js';

interface Fila {
  total: number;
}
interface Montos {
  total: number;
}

const acumulador: AcumuladorDeSubtotales<Fila, Montos> = {
  enCero: () => ({ total: 0 }),
  sumar: (subtotal, filas) => ({ total: subtotal.total + filas.reduce((suma, f) => suma + f.total, 0) }),
};
const filas = (cantidad: number): Fila[] => Array.from({ length: cantidad }, (_, i) => ({ total: i + 1 }));

describe('paginarConSubtotales', () => {
  it('sin filas hay una hoja vacía y la del resumen', () => {
    const libro = paginarConSubtotales([], acumulador, 4);

    expect(libro.paginas).toHaveLength(1);
    expect(libro.paginas[0]).toMatchObject({ filas: [], vienen: null, esUltima: true });
    expect(libro.hojas).toBe(2);
  });

  it('cada hoja trae lo que vienen y lleva lo acumulado', () => {
    const [primera, segunda, tercera] = paginarConSubtotales(filas(10), acumulador, 4).paginas;

    expect(primera).toMatchObject({ vienen: null, acumulado: { total: 10 }, esUltima: false });
    expect(segunda).toMatchObject({ vienen: { total: 10 }, acumulado: { total: 36 } });
    expect(tercera).toMatchObject({ vienen: { total: 36 }, acumulado: { total: 55 }, esUltima: true });
  });

  it('foliosQueGasta cuenta las hojas de filas más la del resumen', () => {
    expect(foliosQueGasta(0, 4)).toBe(2);
    expect(foliosQueGasta(4, 4)).toBe(2);
    expect(foliosQueGasta(5, 4)).toBe(3);
    expect(foliosQueGasta(65)).toBe(4);
  });
});
