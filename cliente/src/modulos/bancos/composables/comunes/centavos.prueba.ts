import { describe, expect, it } from 'vitest';
import { aCentavos, deCentavos } from './centavos';

describe('aCentavos', () => {
  it('pasa el texto a centavos enteros', () => {
    expect(aCentavos('1250.50')).toBe(125050);
    expect(aCentavos('0.10')).toBe(10);
    expect(aCentavos('7')).toBe(700);
    expect(aCentavos('7.5')).toBe(750);
    expect(aCentavos('-3.25')).toBe(-325);
  });

  it('rechaza lo que no es un importe', () => {
    expect(() => aCentavos('abc')).toThrow();
    expect(() => aCentavos('1.234')).toThrow();
  });
});

describe('deCentavos', () => {
  it('vuelve a texto con dos decimales', () => {
    expect(deCentavos(125050)).toBe('1250.50');
    expect(deCentavos(5)).toBe('0.05');
    expect(deCentavos(0)).toBe('0.00');
    expect(deCentavos(-325)).toBe('-3.25');
  });

  it('sumar 0.10 y 0.20 da exactamente 0.30', () => {
    expect(deCentavos(aCentavos('0.10') + aCentavos('0.20'))).toBe('0.30');
  });
});
