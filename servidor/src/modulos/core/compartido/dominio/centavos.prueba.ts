import { describe, expect, it } from 'vitest';
import { aCentavos, deCentavos } from './centavos.js';

describe('centavos', () => {
  it('convierte el texto del dinero sin perder centavos', () => {
    expect(['0.1', '0.20', '1250', '-150.5', '14.99'].map(aCentavos)).toEqual([10, 20, 125000, -15050, 1499]);
  });

  it('vuelve a texto con dos decimales', () => {
    expect([10 + 20, -15050, 0, -1].map(deCentavos)).toEqual(['0.30', '-150.50', '0.00', '-0.01']);
  });
});
