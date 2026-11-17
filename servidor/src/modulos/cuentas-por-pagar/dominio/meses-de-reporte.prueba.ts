import { describe, expect, it } from 'vitest';
import { inicioDeSemanaDeVencimiento, limitesDelMes, mesAnteriorDe } from './meses-de-reporte.js';

describe('meses de reporte', () => {
  it('el mes anterior pasa de enero a diciembre del año anterior', () => {
    expect(mesAnteriorDe('2026-03-15')).toBe('2026-02');
    expect(mesAnteriorDe('2026-01-02')).toBe('2025-12');
  });

  it('los límites del mes respetan los bisiestos', () => {
    expect(limitesDelMes('2028-02')).toEqual({ desde: '2028-02-01', hasta: '2028-02-29' });
    expect(limitesDelMes('2026-12')).toEqual({ desde: '2026-12-01', hasta: '2026-12-31' });
  });

  it('las semanas de vencimiento empiezan el día después del corte', () => {
    expect(inicioDeSemanaDeVencimiento('2026-03-31', '2026-04-01')).toBe('2026-04-01');
    expect(inicioDeSemanaDeVencimiento('2026-03-31', '2026-04-07')).toBe('2026-04-01');
    expect(inicioDeSemanaDeVencimiento('2026-03-31', '2026-04-08')).toBe('2026-04-08');
  });
});
