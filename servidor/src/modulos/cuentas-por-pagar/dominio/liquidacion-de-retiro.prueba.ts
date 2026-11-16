import { describe, expect, it } from 'vitest';
import { FechaDeLiquidacionInvalida, LiquidacionNoCuadra, MotivoDeFaltanteObligatorio } from './errores-de-retiros.js';
import { exigirFechaDeLiquidacion, exigirLiquidacionCuadrada, liquidaElCustodio } from './liquidacion-de-retiro.js';

describe('la liquidación cuadra con lo que no se pagó', () => {
  it('lo devuelto más el faltante es el sobrante; sin faltante no hay motivo', () => {
    const devuelve = { devueltoCentavos: 40000, faltanteCentavos: 0, motivoDeFaltante: 'x' };

    expect(exigirLiquidacionCuadrada(40000, devuelve)).toBeNull();
    expect(
      exigirLiquidacionCuadrada(0, { devueltoCentavos: 0, faltanteCentavos: 0, motivoDeFaltante: null }),
    ).toBeNull();
  });

  it('un faltante lleva su motivo, sin espacios sobrantes', () => {
    const pedida = { devueltoCentavos: 30000, faltanteCentavos: 10000 };

    expect(exigirLiquidacionCuadrada(40000, { ...pedida, motivoDeFaltante: ' Se cayó ' })).toBe('Se cayó');
    expect(() => exigirLiquidacionCuadrada(40000, { ...pedida, motivoDeFaltante: '  ' })).toThrow(
      MotivoDeFaltanteObligatorio,
    );
    expect(() => exigirLiquidacionCuadrada(40000, { ...pedida, motivoDeFaltante: null })).toThrow(
      MotivoDeFaltanteObligatorio,
    );
  });

  it('rechaza lo que no suma el sobrante y dice cuánto es', () => {
    const pedida = { devueltoCentavos: 10000, faltanteCentavos: 10000, motivoDeFaltante: 'x' };

    expect(() => exigirLiquidacionCuadrada(40000, pedida)).toThrow(LiquidacionNoCuadra);
    expect(() => exigirLiquidacionCuadrada(40000, pedida)).toThrow('Q400.00');
  });
});

describe('la fecha de la liquidación', () => {
  const limites = { minima: '2026-11-10', hoy: '2026-11-15' };

  it('no es futura ni anterior al mínimo', () => {
    expect(() => exigirFechaDeLiquidacion('2026-11-16', limites)).toThrow(FechaDeLiquidacionInvalida);
    expect(() => exigirFechaDeLiquidacion('2026-11-09', limites)).toThrow('10/11/2026');
    expect(() => exigirFechaDeLiquidacion('2026-11-10', limites)).not.toThrow();
    expect(() => exigirFechaDeLiquidacion('2026-11-15', limites)).not.toThrow();
  });
});

describe('el custodio que liquida su propio retiro', () => {
  it('solo si el custodio es un usuario y es quien liquida', () => {
    expect(liquidaElCustodio('u1', 'u1')).toBe(true);
    expect(liquidaElCustodio('u1', 'u2')).toBe(false);
    expect(liquidaElCustodio(null, 'u1')).toBe(false);
  });
});
