import { describe, expect, it } from 'vitest';
import { isrPropuesto, netoDeIntereses, TASA_DE_ISR_POR_OMISION } from './intereses-de-nota';

describe('intereses de una nota', () => {
  it('propone el 10 % del bruto en centavos exactos', () => {
    expect(isrPropuesto('100.00', TASA_DE_ISR_POR_OMISION)).toBe('10.00');
    expect(isrPropuesto('1234.56', TASA_DE_ISR_POR_OMISION)).toBe('123.46');
    expect(isrPropuesto('0.05', TASA_DE_ISR_POR_OMISION)).toBe('0.01');
    expect(isrPropuesto(250, TASA_DE_ISR_POR_OMISION)).toBe('25.00');
  });

  it('respeta la tasa de la instalación', () => {
    expect(isrPropuesto('100.00', 0.05)).toBe('5.00');
    expect(isrPropuesto('100.00', 0)).toBe('0.00');
  });

  it('no propone nada mientras el bruto no sirve', () => {
    expect(isrPropuesto('', 0.1)).toBe('');
    expect(isrPropuesto('abc', 0.1)).toBe('');
    expect(isrPropuesto('-5', 0.1)).toBe('');
    expect(isrPropuesto('0', 0.1)).toBe('');
  });

  it('el neto es bruto - ISR, sin errores de decimales', () => {
    expect(netoDeIntereses('100.00', '10.00')).toBe('90.00');
    expect(netoDeIntereses('0.30', '0.10')).toBe('0.20');
    expect(netoDeIntereses('100', '0')).toBe('100.00');
  });

  it('el neto queda vacío si falta un dato, el ISR es negativo o se come todo el bruto', () => {
    expect(netoDeIntereses('', '10.00')).toBe('');
    expect(netoDeIntereses('100.00', '')).toBe('');
    expect(netoDeIntereses('100.00', '-1.00')).toBe('');
    expect(netoDeIntereses('100.00', '100.00')).toBe('');
    expect(netoDeIntereses('100.00', '150.00')).toBe('');
  });
});
