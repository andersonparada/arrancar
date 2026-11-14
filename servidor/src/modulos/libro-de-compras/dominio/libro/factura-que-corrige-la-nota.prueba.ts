import { describe, expect, it } from 'vitest';
import { textoDeLaFacturaQueCorrige } from './factura-que-corrige-la-nota.js';

describe('texto del documento que modifica', () => {
  it('lleva serie, número y fecha', () => {
    expect(textoDeLaFacturaQueCorrige({ serie: 'A', numero: '123', fechaEmision: '2026-01-05' })).toBe(
      'A-123 del 05/01/2026',
    );
  });

  it('sin serie lleva solo el número', () => {
    expect(textoDeLaFacturaQueCorrige({ serie: null, numero: '123', fechaEmision: '2026-01-05' })).toBe(
      '123 del 05/01/2026',
    );
  });

  it('en lo que no es nota no hay nada', () => {
    expect(textoDeLaFacturaQueCorrige(null)).toBeNull();
  });
});
