import { describe, expect, it } from 'vitest';
import { esFechaCompleta, primerDiaDelMes, sumarDias } from './fechas-de-reportes';

describe('fechas de los reportes', () => {
  it('suma y resta días cruzando mes y año', () => {
    expect(sumarDias('2026-11-28', 7)).toBe('2026-12-05');
    expect(sumarDias('2026-01-01', -1)).toBe('2025-12-31');
    expect(sumarDias('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('da el primer día del mes', () => {
    expect(primerDiaDelMes('2026-11-15')).toBe('2026-11-01');
  });

  it('solo acepta fechas completas y reales', () => {
    expect(esFechaCompleta('2026-11-15')).toBe(true);
    expect(esFechaCompleta('')).toBe(false);
    expect(esFechaCompleta('2026-1-5')).toBe(false);
    expect(esFechaCompleta('2026-02-30')).toBe(false);
  });
});
