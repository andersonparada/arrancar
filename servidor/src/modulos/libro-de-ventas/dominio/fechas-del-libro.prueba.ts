import { describe, expect, it } from 'vitest';
import {
  primerDiaDelMes,
  sumarMeses,
  sumarMesesALaFecha,
  ultimoDiaDelMes,
  venceLaVispera,
} from './fechas-del-libro.js';

describe('fechas del libro', () => {
  it('toma el primer día del mes', () => {
    expect(primerDiaDelMes('2026-03-17')).toBe('2026-03-01');
  });

  it('suma meses y cruza el año', () => {
    expect(sumarMeses('2026-11-20', 2)).toBe('2027-01-01');
    expect(sumarMeses('2026-01-31', -1)).toBe('2025-12-01');
  });

  it('da el último día del mes, también en año bisiesto', () => {
    expect(ultimoDiaDelMes('2026-02-10')).toBe('2026-02-28');
    expect(ultimoDiaDelMes('2028-02-10')).toBe('2028-02-29');
    expect(ultimoDiaDelMes('2026-12-05')).toBe('2026-12-31');
  });

  it('suma meses a la fecha y corta en el último día si el mes no llega', () => {
    expect(sumarMesesALaFecha('2026-12-31', 2)).toBe('2027-02-28');
    expect(sumarMesesALaFecha('2026-03-15', 2)).toBe('2026-05-15');
  });

  it('el plazo de dos meses vence la víspera', () => {
    expect(venceLaVispera('2026-03-15', 2)).toBe('2026-05-14');
    expect(venceLaVispera('2026-12-31', 2)).toBe('2027-02-28');
  });

  it('rechaza una fecha que no existe', () => {
    expect(() => primerDiaDelMes('2026-02-30')).toThrow();
  });
});
