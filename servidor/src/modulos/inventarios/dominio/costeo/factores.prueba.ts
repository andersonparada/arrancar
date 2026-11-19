import { describe, expect, it } from 'vitest';
import { FactorInicialFaltante } from './errores.js';
import { SeguimientoDeFactores } from './factores.js';

describe('SeguimientoDeFactores', () => {
  it('falla si el objetivo no trae factor inicial ni entra en el recorrido', () => {
    const seguimiento = new SeguimientoDeFactores(new Set(['A']));
    expect(() => seguimiento.de('A')).toThrow(FactorInicialFaltante);
  });

  it('usa el factor inicial y arranca en 1 al entrar en el recorrido', () => {
    const inicial = new Map([['A', { numerador: 3n, denominador: 5n }]]);
    const seguimiento = new SeguimientoDeFactores(new Set(['A', 'B']), inicial);
    expect(seguimiento.de('A')).toEqual({ numerador: 3n, denominador: 5n });
    seguimiento.alEntrar('B');
    expect(seguimiento.de('B')).toEqual({ numerador: 1n, denominador: 1n });
  });
});
