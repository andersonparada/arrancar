import { describe, expect, it } from 'vitest';
import { esNitValido, normalizarNit } from './nit.js';

describe('NIT de Guatemala', () => {
  it('normaliza guiones, espacios y minúsculas', () => {
    expect(normalizarNit(' 576937-k ')).toBe('576937K');
  });

  it.each(['576937K', '12345679', '123456789', 'CF'])('acepta NIT con verificador correcto: %s', (nit) => {
    expect(esNitValido(nit)).toBe(true);
  });

  it.each(['576937-K', '12345678', '5769370', 'ABC', ''])('rechaza NIT inválido: %s', (nit) => {
    expect(esNitValido(nit)).toBe(false);
  });
});
