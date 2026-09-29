import { describe, expect, it } from 'vitest';
import { PARAMETROS_DE_MONTO } from './constantes.js';
import { diasEntre, palabrasQueCuentan, pesoDeMonto, pesoDeRecencia, similitudDeTextos } from './pesos.js';

describe('pesos de las sugerencias', () => {
  it('la recencia pesa 1 el mismo día y 0.5 tras una vida media', () => {
    expect(pesoDeRecencia(0, 180)).toBe(1);
    expect(pesoDeRecencia(180, 180)).toBeCloseTo(0.5, 10);
    expect(pesoDeRecencia(360, 180)).toBeCloseTo(0.25, 10);
  });

  it('los días entre fechas no dependen del orden', () => {
    expect(diasEntre('2026-01-01', '2026-01-31')).toBe(30);
    expect(diasEntre('2026-01-31', '2026-01-01')).toBe(30);
  });

  it('el monto pesa 1 si es igual y baja con la razón, sin pasar de su piso', () => {
    const peso = (a: number, b: number) => pesoDeMonto(a, b, PARAMETROS_DE_MONTO);
    expect(peso(10000, 10000)).toBe(1);
    expect(peso(12000, 10000)).toBeCloseTo(0.92, 2);
    expect(peso(15000, 10000)).toBeCloseTo(0.69, 2);
    expect(peso(20000, 10000)).toBeCloseTo(0.39, 2);
    expect(peso(30000, 10000)).toBeCloseTo(0.22, 2);
    expect(peso(10000, 30000)).toBeCloseTo(peso(30000, 10000), 10);
    expect(peso(100, 10_000_000)).toBeGreaterThanOrEqual(0.2);
  });

  it('las palabras que cuentan dejan fuera los números y las de menos de 3 letras', () => {
    expect(palabrasQueCuentan('pago factura 12345 no ab abc')).toEqual(new Set(['pago', 'factura', 'abc']));
    expect(palabrasQueCuentan(null)).toEqual(new Set());
  });

  it('Jaccard entre textos; 0 si alguno no tiene palabras', () => {
    expect(similitudDeTextos('comision mensual', 'comision mensual')).toBe(1);
    expect(similitudDeTextos('comision mensual', 'comision anual')).toBeCloseTo(1 / 3, 10);
    expect(similitudDeTextos('comision 2026', '12 34')).toBe(0);
    expect(similitudDeTextos(null, 'comision')).toBe(0);
  });
});
