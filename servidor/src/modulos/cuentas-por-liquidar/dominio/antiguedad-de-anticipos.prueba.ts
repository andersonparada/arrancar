import { describe, expect, it } from 'vitest';
import { tramoDeAntiguedad, valorDeCuotaEnCentavos } from './antiguedad-de-anticipos.js';

describe('tramoDeAntiguedad', () => {
  it.each([
    [-5, 'al_dia'],
    [0, 'al_dia'],
    [1, 'de_1_a_30'],
    [30, 'de_1_a_30'],
    [31, 'de_31_a_60'],
    [60, 'de_31_a_60'],
    [61, 'de_61_a_90'],
    [90, 'de_61_a_90'],
    [91, 'mas_de_90'],
  ])('%i días vencido es %s', (dias, tramo) => {
    expect(tramoDeAntiguedad(dias)).toBe(tramo);
  });
});

describe('valorDeCuotaEnCentavos', () => {
  it('redondea hacia abajo', () => {
    expect(valorDeCuotaEnCentavos(100_000, 6)).toBe(16_666);
    expect(valorDeCuotaEnCentavos(100_000, 5)).toBe(20_000);
  });
});
