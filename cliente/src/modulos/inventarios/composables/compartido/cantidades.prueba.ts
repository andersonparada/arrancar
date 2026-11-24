import { describe, expect, it } from 'vitest';
import { esCantidadPositiva, esMontoValido, sinCerosFinales, sumarDecimales } from './cantidades';

describe('cantidades del servidor', () => {
  it('quita los ceros que sobran sin tocar los enteros', () => {
    expect(sinCerosFinales('24.00000000')).toBe('24');
    expect(sinCerosFinales('110.50000000')).toBe('110.5');
    expect(sinCerosFinales('0.00026417')).toBe('0.00026417');
    expect(sinCerosFinales('100')).toBe('100');
    expect(sinCerosFinales('100.0')).toBe('100');
    expect(sinCerosFinales(null)).toBe('');
  });
});

describe('sumar decimales', () => {
  it('suma sin errores de coma flotante', () => {
    expect(sumarDecimales(['0.1000', '0.2000'], 4)).toBe('0.3000');
    expect(sumarDecimales(['10.50', '4.25', '0.01'], 2)).toBe('14.76');
  });

  it('los valores que no se ven (null) no suman y, si todos faltan, no hay total', () => {
    expect(sumarDecimales(['5.00', null], 2)).toBe('5.00');
    expect(sumarDecimales([null, null], 2)).toBeNull();
    expect(sumarDecimales([], 2)).toBeNull();
  });

  it('maneja negativos y cantidades grandes', () => {
    expect(sumarDecimales(['-3.50', '1.00'], 2)).toBe('-2.50');
    expect(sumarDecimales(['123456789012.34', '0.66'], 2)).toBe('123456789013.00');
  });
});

describe('validación de lo escrito', () => {
  it('una cantidad es positiva y lleva hasta 4 decimales', () => {
    expect(esCantidadPositiva('12.5')).toBe(true);
    expect(esCantidadPositiva(3)).toBe(true);
    expect(esCantidadPositiva('0')).toBe(false);
    expect(esCantidadPositiva('1.23456')).toBe(false);
    expect(esCantidadPositiva('')).toBe(false);
    expect(esCantidadPositiva('-2')).toBe(false);
  });

  it('un monto admite cero y hasta 2 decimales', () => {
    expect(esMontoValido('0')).toBe(true);
    expect(esMontoValido('15.75')).toBe(true);
    expect(esMontoValido('15.755')).toBe(false);
    expect(esMontoValido(null)).toBe(false);
  });
});
