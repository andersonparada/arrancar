import { describe, expect, it } from 'vitest';
import { periodoPropuesto } from './periodo-propuesto';

describe('periodo propuesto', () => {
  it('sin conciliaciones, propone el mes anterior al actual', () => {
    expect(periodoPropuesto(null, new Date(2026, 8, 15))).toEqual({ anio: 2026, mes: 8 });
  });

  it('sin conciliaciones, en enero propone diciembre del año anterior', () => {
    expect(periodoPropuesto(null, new Date(2026, 0, 15))).toEqual({ anio: 2025, mes: 12 });
  });

  it('con una última conciliación, propone el mes siguiente', () => {
    expect(periodoPropuesto({ anio: 2026, mes: 3 }, new Date(2026, 8, 15))).toEqual({ anio: 2026, mes: 4 });
  });

  it('si la última fue diciembre, propone enero del año siguiente', () => {
    expect(periodoPropuesto({ anio: 2025, mes: 12 }, new Date(2026, 8, 15))).toEqual({ anio: 2026, mes: 1 });
  });
});
