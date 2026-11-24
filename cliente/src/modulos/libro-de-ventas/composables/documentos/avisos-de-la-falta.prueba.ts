import { describe, expect, it } from 'vitest';
import { avisoDeLaFalta } from './avisos-de-la-falta';

describe('aviso de lo que falta', () => {
  it('une las frases con comas y «y»', () => {
    expect(avisoDeLaFalta([])).toBe('');
    expect(avisoDeLaFalta(['el número'])).toBe('Falta el número.');
    expect(avisoDeLaFalta(['el número', 'la fecha', 'el total'])).toBe('Falta el número, la fecha y el total.');
  });
});
