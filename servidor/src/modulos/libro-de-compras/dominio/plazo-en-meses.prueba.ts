import { describe, expect, it } from 'vitest';
import { venceLaVispera } from './plazo-en-meses.js';

describe('venceLaVispera (plazo en meses, de fecha a fecha)', () => {
  it('vence la víspera del mismo día: del 15/03 a dos meses, hasta el 14/05', () => {
    expect(venceLaVispera('2026-03-15', 2)).toBe('2026-05-14');
  });

  it('el día 1 vence el último día del mes anterior', () => {
    expect(venceLaVispera('2026-03-01', 2)).toBe('2026-04-30');
  });

  it('cruza el año', () => {
    expect(venceLaVispera('2026-11-20', 2)).toBe('2027-01-19');
    expect(venceLaVispera('2026-12-01', 1)).toBe('2026-12-31');
  });

  it('31 contra un mes de 30 días: vence el último día de ese mes', () => {
    expect(venceLaVispera('2026-03-31', 1)).toBe('2026-04-30');
    expect(venceLaVispera('2026-08-31', 1)).toBe('2026-09-30');
  });

  it('31 contra un mes de 31 días: es la víspera del 31', () => {
    expect(venceLaVispera('2026-10-31', 2)).toBe('2026-12-30');
  });

  it('febrero: el 29, 30 y 31 vencen el último día; en año bisiesto, el 29', () => {
    expect(venceLaVispera('2026-12-31', 2)).toBe('2027-02-28');
    expect(venceLaVispera('2026-12-29', 2)).toBe('2027-02-28');
    expect(venceLaVispera('2027-12-31', 2)).toBe('2028-02-29');
    expect(venceLaVispera('2027-12-28', 2)).toBe('2028-02-27');
  });

  it('desde un febrero', () => {
    expect(venceLaVispera('2027-02-28', 1)).toBe('2027-03-27');
    expect(venceLaVispera('2028-02-29', 12)).toBe('2029-02-28');
  });
});
