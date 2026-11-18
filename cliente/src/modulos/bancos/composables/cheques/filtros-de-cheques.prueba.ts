import { describe, expect, it } from 'vitest';
import { filtroDeLaConsulta, filtrosDesdeLaRuta, filtrosPorOmision } from './filtros-de-cheques';

describe('filtros de cheques por omisión', () => {
  it('van del primer día del mes actual en adelante, sin tope (entran los posfechados)', () => {
    expect(filtrosPorOmision(new Date(2026, 8, 27))).toEqual({
      cuentaBancariaId: null,
      estado: '',
      desde: '2026-09-01',
      hasta: '',
    });
  });

  it('completan los dos dígitos del mes y del día', () => {
    expect(filtrosPorOmision(new Date(2026, 0, 5))).toEqual({
      cuentaBancariaId: null,
      estado: '',
      desde: '2026-01-01',
      hasta: '',
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

describe('filtros de cheques que pide un enlace', () => {
  const hoy = new Date(2026, 10, 18);
  const CUENTA = '0b6f2a54-8d3c-4c1e-9a77-1f2d3c4b5a69';

  it('lee la cuenta, el estado y las fechas', () => {
    expect(
      filtrosDesdeLaRuta(
        { cuentaBancariaId: CUENTA, estado: 'anulado', desde: '2026-01-01', hasta: '2026-12-31' },
        hoy,
      ),
    ).toEqual({ cuentaBancariaId: CUENTA, estado: 'anulado', desde: '2026-01-01', hasta: '2026-12-31' });
  });

  it('descarta lo que no sirve y deja los de siempre', () => {
    expect(
      filtrosDesdeLaRuta({ cuentaBancariaId: 'x', estado: 'otro', desde: '1/1/2026', hasta: ['2026-12-31'] }, hoy),
    ).toEqual(filtrosPorOmision(hoy));
  });
});
