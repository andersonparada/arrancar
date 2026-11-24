import { describe, expect, it } from 'vitest';
import type { Parcela } from '../../servicios/parcelas.api';
import { ordenarComoArbol } from './orden-de-madres';

const parcela = (id: string, madre: string | null, nivel: number): Parcela =>
  ({ id, codigo: id, nombre: id, parcelaMadreId: madre, nivel }) as Parcela;

describe('orden de las madres posibles', () => {
  it('cada madre va seguida de sus hijas, no todas las de un nivel juntas', () => {
    const delServidor = [
      parcela('P-1', null, 1),
      parcela('P-2', null, 1),
      parcela('P-1-A', 'P-1', 2),
      parcela('P-2-A', 'P-2', 2),
      parcela('P-1-A-x', 'P-1-A', 3),
    ];

    expect(ordenarComoArbol(delServidor).map(({ id }) => id)).toEqual(['P-1', 'P-1-A', 'P-1-A-x', 'P-2', 'P-2-A']);
  });

  it('una parcela cuya madre no está en la lista queda como de primer nivel', () => {
    expect(ordenarComoArbol([parcela('H', 'inactiva', 2), parcela('R', null, 1)]).map(({ id }) => id)).toEqual([
      'H',
      'R',
    ]);
  });
});
