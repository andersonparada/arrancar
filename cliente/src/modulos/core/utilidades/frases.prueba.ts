import { describe, expect, it } from 'vitest';
import { conPuntoFinal } from './frases';

describe('conPuntoFinal', () => {
  it('agrega el punto si falta', () => {
    expect(conPuntoFinal('Eco')).toBe('Eco.');
  });

  it('no repite el punto si el nombre ya termina en uno', () => {
    expect(conPuntoFinal('Eco S.A.')).toBe('Eco S.A.');
  });
});
