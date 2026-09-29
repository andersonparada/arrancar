import { describe, expect, it } from 'vitest';
import { normalizarNumeroDeCuenta } from './numero-de-cuenta.js';

describe('normalizarNumeroDeCuenta', () => {
  it('quita guiones, espacios y otros separadores', () => {
    expect(normalizarNumeroDeCuenta('001-23 45')).toBe('0012345');
    expect(normalizarNumeroDeCuenta(' 3.033/01234_5 ')).toBe('3033012345');
  });

  it('pasa a mayúsculas las letras', () => {
    expect(normalizarNumeroDeCuenta('ab-12c')).toBe('AB12C');
  });

  it('conserva los ceros a la izquierda', () => {
    expect(normalizarNumeroDeCuenta('000-1')).toBe('0001');
  });

  it('un número de solo separadores queda vacío', () => {
    expect(normalizarNumeroDeCuenta('- - -')).toBe('');
  });
});
