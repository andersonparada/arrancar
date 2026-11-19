import { describe, expect, it } from 'vitest';
import { DemasiadasUnidades, MontoDeCostoInvalido } from './errores-de-costo.js';
import { repartirEnPartes, unidadesValidas } from './reparto-de-costos.js';

const suma = (partes: number[]) => partes.reduce((total, parte) => total + parte, 0);

describe('repartirEnPartes', () => {
  it('Q750,000.01 en 3: dos partes iguales y el sobrante en el último', () => {
    expect(repartirEnPartes(75_000_001, 3)).toEqual([25_000_000, 25_000_000, 25_000_001]);
  });

  it('un reparto exacto no deja sobrante', () => {
    expect(repartirEnPartes(1_500_000, 3)).toEqual([500_000, 500_000, 500_000]);
  });

  it('una sola parte lleva todo el monto', () => {
    expect(repartirEnPartes(12_345, 1)).toEqual([12_345]);
  });

  it('con un monto negativo (nota de crédito) reparte el valor absoluto y conserva el signo', () => {
    expect(repartirEnPartes(-100, 3)).toEqual([-33, -33, -34]);
  });

  it('la suma de las partes es siempre el monto, aun con muchas partes', () => {
    for (const [monto, partes] of [
      [1, 1],
      [99_999_999, 7],
      [10_001, 200],
      [-5_555_555, 13],
    ] as const) {
      expect(suma(repartirEnPartes(monto, partes))).toBe(monto);
    }
  });

  it('rechaza un monto cero, fraccionado o que no alcanza un centavo por parte', () => {
    expect(() => repartirEnPartes(0, 2)).toThrow(MontoDeCostoInvalido);
    expect(() => repartirEnPartes(10.5, 2)).toThrow(MontoDeCostoInvalido);
    expect(() => repartirEnPartes(2, 3)).toThrow(MontoDeCostoInvalido);
  });
});

describe('unidadesValidas', () => {
  it('acepta de 1 a 200', () => {
    expect(unidadesValidas(1)).toBe(1);
    expect(unidadesValidas(200)).toBe(200);
  });

  it('201 unidades pasan del tope de la operación', () => {
    expect(() => unidadesValidas(201)).toThrow(DemasiadasUnidades);
  });

  it('rechaza cero, negativos y fracciones', () => {
    for (const invalida of [0, -1, 2.5]) expect(() => unidadesValidas(invalida)).toThrow(MontoDeCostoInvalido);
  });
});
