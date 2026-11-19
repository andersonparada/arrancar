import { describe, expect, it } from 'vitest';
import { centavosConSigno, centavosDe, sumarMontos, textoConSigno, textoDeCentavos } from './dinero';

describe('dinero de Caja chica', () => {
  it('pasa montos escritos a centavos y de vuelta', () => {
    expect(centavosDe('1250.5')).toBe(125050);
    expect(centavosDe('abc')).toBeNull();
    expect(textoDeCentavos(5)).toBe('0.05');
    expect(sumarMontos(['10.10', '0.90', 'x'])).toBe('11.00');
  });

  it('entiende los montos con signo', () => {
    expect(centavosConSigno('-50.25')).toBe(-5025);
    expect(centavosConSigno('50.25')).toBe(5025);
    expect(centavosConSigno('--1')).toBeNull();
    expect(textoConSigno(-5025)).toBe('-50.25');
    expect(textoConSigno(0)).toBe('0.00');
  });
});
