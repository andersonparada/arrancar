import { describe, expect, it } from 'vitest';
import { galonesATexto } from './galones.js';
import { rangoDePeriodos, RangoDePeriodosInvalido } from './rango-de-periodos.js';
import { agruparConSubtotal, sumarColumnas } from './subtotales.js';

describe('rangoDePeriodos', () => {
  it('lleva ambos extremos al primer día del mes', () => {
    expect(rangoDePeriodos('2026-03', '2026-04-15')).toEqual({ desde: '2026-03-01', hasta: '2026-04-01' });
  });

  it('admite un solo mes y exactamente 24 meses', () => {
    expect(rangoDePeriodos('2026-03', '2026-03')).toEqual({ desde: '2026-03-01', hasta: '2026-03-01' });
    expect(rangoDePeriodos('2025-01', '2026-12').hasta).toBe('2026-12-01');
  });

  it('rechaza el rango al revés, el de más de 24 meses y los meses mal escritos', () => {
    expect(() => rangoDePeriodos('2026-05', '2026-04')).toThrow(RangoDePeriodosInvalido);
    expect(() => rangoDePeriodos('2024-01', '2026-01')).toThrow(RangoDePeriodosInvalido);
    expect(() => rangoDePeriodos('2026-13', '2026-12')).toThrow(RangoDePeriodosInvalido);
    expect(() => rangoDePeriodos('2026-01', 'hoy')).toThrow('"hasta"');
  });
});

describe('subtotales', () => {
  const filas = [
    { motivo: 'a', monto: 500, lineas: 1 },
    { motivo: 'b', monto: -200, lineas: 1 },
    { motivo: 'a', monto: 250, lineas: 2 },
  ];

  it('suma las columnas pedidas, con negativos', () => {
    expect(sumarColumnas(filas, ['monto', 'lineas'])).toEqual({ monto: 550, lineas: 4 });
    expect(sumarColumnas([], ['monto'])).toEqual({ monto: 0 });
  });

  it('agrupa en el orden de aparición con el subtotal de cada grupo', () => {
    const grupos = agruparConSubtotal(filas, { clave: (f) => f.motivo, sumar: ['monto'] });

    expect(grupos.map((g) => [g.clave, g.filas.length, g.subtotal.monto])).toEqual([
      ['a', 2, 750],
      ['b', 1, -200],
    ]);
  });
});

describe('galonesATexto', () => {
  it('escribe las milésimas con tres decimales y conserva el signo', () => {
    expect(galonesATexto(10500)).toBe('10.500');
    expect(galonesATexto(5)).toBe('0.005');
    expect(galonesATexto(-250)).toBe('-0.250');
    expect(galonesATexto(0)).toBe('0.000');
  });
});
