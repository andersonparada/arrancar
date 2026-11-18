import { describe, expect, it } from 'vitest';
import { rangoDeBancarizacion } from './rango-de-bancarizacion.js';

describe('rangoDeBancarizacion', () => {
  it('por omisión toma los últimos 12 meses hasta el de hoy', () => {
    expect(rangoDeBancarizacion({}, '2026-11-18')).toEqual({
      desdeMes: '2025-12',
      hastaMes: '2026-11',
      desde: '2025-12-01',
      hasta: '2026-11-30',
    });
  });

  it('cruza el año hacia atrás y respeta febrero bisiesto', () => {
    expect(rangoDeBancarizacion({}, '2024-02-10')).toMatchObject({ desde: '2023-03-01', hasta: '2024-02-29' });
  });

  it('acepta un rango de exactamente 48 meses y rechaza uno de 49', () => {
    expect(rangoDeBancarizacion({ desde: '2023-01', hasta: '2026-12' }, '2026-12-01').desdeMes).toBe('2023-01');
    expect(() => rangoDeBancarizacion({ desde: '2022-12', hasta: '2026-12' }, '2026-12-01')).toThrowError(
      expect.objectContaining({ codigo: 'rango_de_reporte_muy_largo' }),
    );
  });

  it('rechaza un rango al revés y acepta un solo mes', () => {
    expect(() => rangoDeBancarizacion({ desde: '2026-05', hasta: '2026-04' }, '2026-12-01')).toThrowError(
      expect.objectContaining({ codigo: 'rango_de_reporte_invalido' }),
    );
    expect(rangoDeBancarizacion({ desde: '2026-04', hasta: '2026-04' }, '2026-12-01')).toMatchObject({
      desde: '2026-04-01',
      hasta: '2026-04-30',
    });
  });

  it('con solo el desde, termina en el mes de hoy', () => {
    expect(rangoDeBancarizacion({ desde: '2026-09' }, '2026-11-18').hastaMes).toBe('2026-11');
  });
});
