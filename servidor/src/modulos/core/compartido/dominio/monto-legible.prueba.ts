import { describe, expect, it } from 'vitest';
import { montoLegible } from './monto-legible.js';

describe('montoLegible', () => {
  it('lleva separador de miles, dos decimales y espacio tras la Q', () => {
    expect(montoLegible('12270.5')).toBe('Q 12,270.50');
    expect(montoLegible(0)).toBe('Q 0.00');
  });

  it('pone el signo antes de la Q en los negativos', () => {
    expect(montoLegible('-16010.00')).toBe('-Q 16,010.00');
  });
});
