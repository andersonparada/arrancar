import { describe, expect, it } from 'vitest';
import {
  alternarConcepto,
  filtroDeLaConsulta,
  filtroDelDetalle,
  filtrosPorOmision,
  MAXIMO_DE_CONCEPTOS,
  resumenDeConceptosElegidos,
} from './filtros-por-concepto';

const filtros = { cuentaBancariaId: null, desde: '2026-02-01', hasta: '2026-02-28', conceptoIds: [] };

describe('filtros de movimientos por concepto', () => {
  it('al abrir son todas las cuentas y conceptos, en el mes en curso', () => {
    expect(filtrosPorOmision(new Date(2026, 8, 29))).toEqual({
      cuentaBancariaId: null,
      desde: '2026-09-01',
      hasta: '2026-09-29',
      conceptoIds: [],
    });
  });

  it('al servidor van los conceptos separados por comas y, sin ninguno, no se manda el filtro', () => {
    expect(filtroDeLaConsulta(filtros).conceptoIds).toBeUndefined();
    expect(filtroDeLaConsulta({ ...filtros, cuentaBancariaId: 'cb-1', conceptoIds: ['a', 'b'] })).toEqual({
      cuentaBancariaId: 'cb-1',
      desde: '2026-02-01',
      hasta: '2026-02-28',
      conceptoIds: 'a,b',
    });
  });

  it('el detalle de un concepto pide el mismo rango y cuenta con ese único concepto', () => {
    expect(filtroDelDetalle({ ...filtros, cuentaBancariaId: 'cb-1', conceptoIds: ['a', 'b'] }, 'b')).toEqual({
      cuentaBancariaId: 'cb-1',
      desde: '2026-02-01',
      hasta: '2026-02-28',
      conceptoId: 'b',
    });
  });
});

describe('elegir conceptos', () => {
  it('marca y desmarca sin tocar la lista original', () => {
    const elegidos = ['a'];

    expect(alternarConcepto(elegidos, 'b')).toEqual(['a', 'b']);
    expect(alternarConcepto(['a', 'b'], 'a')).toEqual(['b']);
    expect(elegidos).toEqual(['a']);
  });

  it('con el tope lleno deja desmarcar pero no marcar más', () => {
    const llena = Array.from({ length: MAXIMO_DE_CONCEPTOS }, (_, i) => `c${i}`);

    expect(alternarConcepto(llena, 'otro')).toEqual(llena);
    expect(alternarConcepto(llena, 'c0')).toHaveLength(MAXIMO_DE_CONCEPTOS - 1);
  });

  it('el resumen dice todos, uno o cuántos', () => {
    expect(resumenDeConceptosElegidos([])).toBe('Todos');
    expect(resumenDeConceptosElegidos(['a'])).toBe('1 concepto');
    expect(resumenDeConceptosElegidos(['a', 'b', 'c'])).toBe('3 conceptos');
  });
});
