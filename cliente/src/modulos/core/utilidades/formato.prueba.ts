import { describe, expect, it } from 'vitest';
import { formatearNit, formatearTipoDeCambio } from './formato';

describe('formatearTipoDeCambio', () => {
  it('muestra al menos 5 decimales y quita los ceros sobrantes', () => {
    expect(formatearTipoDeCambio('7.64489000')).toBe('7.64489');
    expect(formatearTipoDeCambio('7.6')).toBe('7.60000');
    expect(formatearTipoDeCambio('0.0512')).toBe('0.05120');
    expect(formatearTipoDeCambio('8')).toBe('8.00000');
  });

  it('conserva los decimales reales cuando son más de 5', () => {
    expect(formatearTipoDeCambio('0.05123456')).toBe('0.05123456');
    expect(formatearTipoDeCambio('0.00005100')).toBe('0.000051');
  });

  it('sin valor muestra una raya', () => {
    expect(formatearTipoDeCambio(null)).toBe('—');
    expect(formatearTipoDeCambio('')).toBe('—');
    expect(formatearTipoDeCambio('abc')).toBe('—');
  });
});

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
