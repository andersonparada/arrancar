import { describe, expect, it } from 'vitest';
import { filtroDeLaConsulta, filtrosPorOmision } from './filtros-de-cheques';

describe('filtros de cheques por omisión', () => {
  it('van del primer día del mes actual a hoy', () => {
    expect(filtrosPorOmision(new Date(2026, 8, 27))).toEqual({
      cuentaBancariaId: null,
      estado: '',
      desde: '2026-09-01',
      hasta: '2026-09-27',
    });
  });

  it('completan los dos dígitos del mes y del día', () => {
    expect(filtrosPorOmision(new Date(2026, 0, 5))).toEqual({
      cuentaBancariaId: null,
      estado: '',
      desde: '2026-01-01',
      hasta: '2026-01-05',
    });
  });
});

describe('filtro de cheques para el servidor', () => {
  it('manda solo lo que se eligió', () => {
    expect(filtroDeLaConsulta({ cuentaBancariaId: null, estado: '', desde: '', hasta: '' })).toEqual({
      cuentaBancariaId: undefined,
      estado: undefined,
      desde: undefined,
      hasta: undefined,
    });
  });

  it('manda la cuenta, el estado y las fechas cuando se eligieron', () => {
    expect(
      filtroDeLaConsulta({
        cuentaBancariaId: 'cuenta-1',
        estado: 'anulado',
        desde: '2026-09-01',
        hasta: '2026-09-27',
      }),
    ).toEqual({ cuentaBancariaId: 'cuenta-1', estado: 'anulado', desde: '2026-09-01', hasta: '2026-09-27' });
  });
});
