import { describe, expect, it } from 'vitest';
import { duracionDeAviso } from './duracion-de-aviso';

describe('duracionDeAviso', () => {
  it('los avisos cortos duran lo normal', () => {
    expect(duracionDeAviso('Empresa actualizada.')).toBe(4500);
  });

  it('los avisos largos duran más, con tope', () => {
    expect(duracionDeAviso('a'.repeat(200))).toBe(16000);
    expect(duracionDeAviso('a'.repeat(1000))).toBe(20000);
  });
});
