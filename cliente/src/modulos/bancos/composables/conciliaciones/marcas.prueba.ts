import { describe, expect, it } from 'vitest';
import { conAlternado, conAlternadoConPareja, idsMarcados, parejaDe } from './marcas';

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

describe('parejaDe', () => {
  const candidatos = [
    { id: 'original', revierteAId: null },
    { id: 'inverso', revierteAId: 'original' },
    { id: 'suelto', revierteAId: null },
    { id: 'inverso-de-uno-ya-conciliado', revierteAId: 'conciliado' },
  ];

  it('el original encuentra a su inverso y el inverso, a su original', () => {
    expect(parejaDe(candidatos, 'original')).toBe('inverso');
    expect(parejaDe(candidatos, 'inverso')).toBe('original');
  });

  it('un movimiento suelto no tiene pareja', () => {
    expect(parejaDe(candidatos, 'suelto')).toBeNull();
  });

  it('si el original ya no es candidato (se concilió antes), el inverso va solo', () => {
    expect(parejaDe(candidatos, 'inverso-de-uno-ya-conciliado')).toBeNull();
  });
});

describe('conAlternadoConPareja', () => {
  const candidatos = [
    { id: 'original', revierteAId: null },
    { id: 'inverso', revierteAId: 'original' },
    { id: 'suelto', revierteAId: null },
  ];

  it('marcar uno marca también a su pareja', () => {
    expect(conAlternadoConPareja(new Set(['suelto']), 'inverso', candidatos)).toEqual(
      new Set(['suelto', 'inverso', 'original']),
    );
  });

  it('desmarcar uno desmarca también a su pareja', () => {
    expect(conAlternadoConPareja(new Set(['original', 'inverso', 'suelto']), 'original', candidatos)).toEqual(
      new Set(['suelto']),
    );
  });

  it('un movimiento suelto se alterna solo, sin mutar el conjunto original', () => {
    const original = new Set<string>();

    expect(conAlternadoConPareja(original, 'suelto', candidatos)).toEqual(new Set(['suelto']));
    expect(original.size).toBe(0);
  });
});
