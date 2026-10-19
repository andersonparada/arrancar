import { describe, expect, it } from 'vitest';
import {
  FECHA_DE_DEROGACION_AGROPECUARIO,
  problemasDeLaDerogacion,
  problemasDeLaFechaDeVigencia,
} from './vigencia-fiscal-de-empresa.js';

const HOY = '2026-10-05';

describe('la fecha desde la que rigen unos datos', () => {
  it('«desde el inicio» (nula) siempre vale', () => {
    expect(problemasDeLaFechaDeVigencia(null, HOY)).toEqual([]);
  });

  it('acepta el primer día de un mes, hasta doce meses después del actual', () => {
    expect(problemasDeLaFechaDeVigencia('2026-11-01', HOY)).toEqual([]);
    expect(problemasDeLaFechaDeVigencia('2027-10-01', HOY)).toEqual([]);
    expect(problemasDeLaFechaDeVigencia('2000-01-01', HOY)).toEqual([]);
  });

  it('rechaza un día distinto del primero', () => {
    expect(problemasDeLaFechaDeVigencia('2026-11-02', HOY)).toEqual([
      expect.objectContaining({ campo: 'vigenteDesde' }),
    ]);
  });

  it('rechaza lo anterior al año 2000 y lo posterior a doce meses', () => {
    expect(problemasDeLaFechaDeVigencia('1999-12-01', HOY)).toHaveLength(1);
    expect(problemasDeLaFechaDeVigencia('2027-11-01', HOY)).toHaveLength(1);
  });
});

describe('la derogación del régimen agropecuario', () => {
  it('la fecha es el 1 de julio de 2025 (confirmar en el Decreto 31-2024)', () => {
    expect(FECHA_DE_DEROGACION_AGROPECUARIO).toBe('2025-07-01');
  });

  it('una vigencia agropecuaria anterior o «desde el inicio» vale', () => {
    expect(problemasDeLaDerogacion('contribuyente_agropecuario', null)).toEqual([]);
    expect(problemasDeLaDerogacion('contribuyente_agropecuario', '2025-06-01')).toEqual([]);
  });

  it('una vigencia agropecuaria que inicia en la fecha de derogación o después se rechaza', () => {
    for (const desde of ['2025-07-01', '2026-01-01']) {
      expect(problemasDeLaDerogacion('contribuyente_agropecuario', desde)).toEqual([
        expect.objectContaining({ campo: 'vigenteDesde' }),
      ]);
    }
  });

  it('los demás regímenes no tienen esa regla', () => {
    expect(problemasDeLaDerogacion('general', '2026-01-01')).toEqual([]);
  });
});
