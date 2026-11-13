import { describe, expect, it } from 'vitest';
import {
  esAnteriorALaFechaDeInicio,
  estaEnPlazoDeCredito,
  inicioDelPlazoDeCredito,
} from './anterioridad-a-la-fecha-de-inicio.js';

describe('anterioridad a la fecha de inicio', () => {
  it('sin fecha de inicio nada es anterior ni está en plazo', () => {
    expect(esAnteriorALaFechaDeInicio('2020-01-01', null)).toBe(false);
    expect(estaEnPlazoDeCredito('2020-01-01', null)).toBe(false);
  });

  it('es anterior solo si es estrictamente menor a la fecha de inicio', () => {
    expect(esAnteriorALaFechaDeInicio('2026-03-14', '2026-03-15')).toBe(true);
    expect(esAnteriorALaFechaDeInicio('2026-03-15', '2026-03-15')).toBe(false);
  });

  it('el plazo empieza dos meses antes del mes de la fecha de inicio', () => {
    expect(inicioDelPlazoDeCredito('2026-05-20')).toBe('2026-03-01');
    expect(inicioDelPlazoDeCredito('2026-02-10')).toBe('2025-12-01');
    expect(inicioDelPlazoDeCredito('2026-01-01')).toBe('2025-11-01');
  });

  it('en el borde de los dos meses: el primer día del plazo entra y el día anterior no', () => {
    expect(estaEnPlazoDeCredito('2026-03-01', '2026-05-20')).toBe(true);
    expect(estaEnPlazoDeCredito('2026-02-28', '2026-05-20')).toBe(false);
    expect(estaEnPlazoDeCredito('2026-05-19', '2026-05-20')).toBe(true);
    expect(estaEnPlazoDeCredito('2026-05-20', '2026-05-20')).toBe(false);
  });
});
