import { describe, expect, it } from 'vitest';
import { avisoDeSaldoALaFavor } from './avisos.js';

describe('aviso de saldo a favor de la empresa', () => {
  it('dice cuánto queda a favor, con quetzales y miles, y qué hacer con ello', () => {
    expect(avisoDeSaldoALaFavor(120000)).toBe(
      'Esta nota deja Q1,200.00 a favor de la empresa porque la retención ya se practicó. Compénselo en la próxima factura o pida el reintegro al proveedor.',
    );
  });

  it('escribe los centavos y no agrega separador a las cifras cortas', () => {
    expect(avisoDeSaldoALaFavor(5)).toContain('Q0.05');
    expect(avisoDeSaldoALaFavor(99999999)).toContain('Q999,999.99');
  });
});
