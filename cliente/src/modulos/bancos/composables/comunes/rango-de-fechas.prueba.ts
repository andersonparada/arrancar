import { describe, expect, it } from 'vitest';
import { errorDeRango, rangoDelAnioActual, rangoDelMesActual } from './rango-de-fechas';

describe('rango del mes actual', () => {
  it('va del primer día del mes a hoy', () => {
    expect(rangoDelMesActual(new Date(2026, 8, 29))).toEqual({ desde: '2026-09-01', hasta: '2026-09-29' });
  });

  it('el primer día del mes el rango es de un solo día', () => {
    expect(rangoDelMesActual(new Date(2026, 0, 1))).toEqual({ desde: '2026-01-01', hasta: '2026-01-01' });
  });
});

describe('rango del año actual', () => {
  it('va del primero de enero a hoy', () => {
    expect(rangoDelAnioActual(new Date(2026, 8, 29))).toEqual({ desde: '2026-01-01', hasta: '2026-09-29' });
  });
});

describe('error del rango', () => {
  it('un rango en orden, aunque sea de un día, no da error', () => {
    expect(errorDeRango({ desde: '2026-02-01', hasta: '2026-02-01' })).toBeUndefined();
    expect(errorDeRango({ desde: '2026-02-01', hasta: '2026-02-28' })).toBeUndefined();
  });

  it.each([
    [{ desde: '', hasta: '2026-02-28' }, 'Escribe la fecha inicial y la final.'],
    [{ desde: '2026-02-01', hasta: '' }, 'Escribe la fecha inicial y la final.'],
    [{ desde: '2026-03-01', hasta: '2026-02-28' }, 'La fecha inicial no puede ser posterior a la final.'],
  ])('%j dice cómo corregir', (rango, mensaje) => {
    expect(errorDeRango(rango)).toBe(mensaje);
  });
});
