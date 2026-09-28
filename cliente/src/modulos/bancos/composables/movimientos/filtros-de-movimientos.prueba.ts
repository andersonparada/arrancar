import { describe, expect, it } from 'vitest';
import { filtroDeLaConsulta, filtrosPorOmision } from './filtros-de-movimientos';

describe('filtros de movimientos por omisión', () => {
  it('van del primer día del mes actual a hoy', () => {
    expect(filtrosPorOmision(null, new Date(2026, 8, 27))).toEqual({
      cuentaBancariaId: null,
      desde: '2026-09-01',
      hasta: '2026-09-27',
    });
  });

  it('completan los dos dígitos del mes y del día', () => {
    expect(filtrosPorOmision(null, new Date(2026, 0, 5))).toEqual({
      cuentaBancariaId: null,
      desde: '2026-01-01',
      hasta: '2026-01-05',
    });
  });

  it('arrancan filtrados por la cuenta que llegó en la ruta', () => {
    expect(filtrosPorOmision('cuenta-1', new Date(2026, 8, 27)).cuentaBancariaId).toBe('cuenta-1');
  });
});

describe('filtro de movimientos para el servidor', () => {
  it('manda solo lo que se eligió', () => {
    expect(filtroDeLaConsulta({ cuentaBancariaId: null, desde: '', hasta: '' })).toEqual({
      cuentaBancariaId: undefined,
      desde: undefined,
      hasta: undefined,
    });
  });

  it('manda la cuenta y las fechas cuando se eligieron', () => {
    expect(filtroDeLaConsulta({ cuentaBancariaId: 'cuenta-1', desde: '2026-09-01', hasta: '2026-09-27' })).toEqual({
      cuentaBancariaId: 'cuenta-1',
      desde: '2026-09-01',
      hasta: '2026-09-27',
    });
  });
});
