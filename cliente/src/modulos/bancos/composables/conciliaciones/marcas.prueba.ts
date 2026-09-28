import { describe, expect, it } from 'vitest';
import { conAlternado, idsMarcados } from './marcas';

describe('conAlternado', () => {
  it('agrega el id si no estaba', () => {
    expect(conAlternado(new Set(['a']), 'b')).toEqual(new Set(['a', 'b']));
  });

  it('quita el id si ya estaba', () => {
    expect(conAlternado(new Set(['a', 'b']), 'b')).toEqual(new Set(['a']));
  });

  it('no muta el conjunto original', () => {
    const original = new Set(['a']);
    conAlternado(original, 'b');
    expect(original).toEqual(new Set(['a']));
  });
});

describe('idsMarcados', () => {
  it('toma solo los que llegaron marcados', () => {
    const movimientos = [
      { id: 'a', marcado: true },
      { id: 'b', marcado: false },
      { id: 'c', marcado: true },
    ];
    expect(idsMarcados(movimientos)).toEqual(new Set(['a', 'c']));
  });
});
