import { describe, expect, it } from 'vitest';
import { formatearNit } from './formato';

describe('formatearNit', () => {
  it('separa el dígito verificador con un guion', () => {
    expect(formatearNit('1234567')).toBe('123456-7');
    expect(formatearNit('1234567k')).toBe('1234567-K');
  });

  it('deja igual «CF», lo que ya trae guion y lo vacío', () => {
    expect(formatearNit('CF')).toBe('CF');
    expect(formatearNit('1234567-8')).toBe('1234567-8');
    expect(formatearNit(null)).toBe('');
    expect(formatearNit(undefined)).toBe('');
  });
});
