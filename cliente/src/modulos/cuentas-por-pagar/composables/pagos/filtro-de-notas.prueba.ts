import { describe, expect, it } from 'vitest';
import {
  consultaDeNotas,
  errorDelRangoDeNotas,
  filtroDeNotasVacio,
  hayFiltroDeNotas,
  notaSigueEnLista,
} from './filtro-de-notas';

describe('filtro de notas ya registradas', () => {
  it('sin filtro no manda nada', () => {
    expect(consultaDeNotas(filtroDeNotasVacio())).toEqual({});
    expect(hayFiltroDeNotas(filtroDeNotasVacio())).toBe(false);
  });

  it('manda solo los campos con valor', () => {
    const filtro = { cuentaBancariaId: 'c1', desde: '', hasta: '2026-03-31' };
    expect(consultaDeNotas(filtro)).toEqual({ cuentaBancariaId: 'c1', hasta: '2026-03-31' });
    expect(hayFiltroDeNotas(filtro)).toBe(true);
  });

  it('avisa si el rango está al revés y acepta uno completo o a medias', () => {
    expect(errorDelRangoDeNotas({ cuentaBancariaId: '', desde: '2026-04-01', hasta: '2026-03-01' })).toMatch(/Desde/);
    expect(errorDelRangoDeNotas({ cuentaBancariaId: '', desde: '2026-03-01', hasta: '2026-03-01' })).toBeNull();
    expect(errorDelRangoDeNotas({ cuentaBancariaId: '', desde: '2026-03-01', hasta: '' })).toBeNull();
  });

  it('la nota elegida que sale de la lista se suelta; sin elegir, no hay nada que soltar', () => {
    expect(notaSigueEnLista('a', [{ movimientoId: 'a' }])).toBe(true);
    expect(notaSigueEnLista('a', [{ movimientoId: 'b' }])).toBe(false);
    expect(notaSigueEnLista('', [])).toBe(true);
  });
});
