import { describe, expect, it } from 'vitest';
import {
  FECHA_DE_DEROGACION_REGIMENES_DECRETO_7_2019,
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

describe('la derogación de los regímenes del Decreto 7-2019', () => {
  it('la fecha es el 9 de julio de 2025 (confirmar en el texto oficial del Decreto 31-2024)', () => {
    expect(FECHA_DE_DEROGACION_REGIMENES_DECRETO_7_2019).toBe('2025-07-09');
  });

  it.each(['contribuyente_agropecuario', 'pequeno_contribuyente_electronico'] as const)(
    'el régimen %s vale antes de la derogación o «desde el inicio»',
    (regimen) => {
      expect(problemasDeLaDerogacion(regimen, null)).toEqual([]);
      expect(problemasDeLaDerogacion(regimen, '2025-07-01')).toEqual([]);
    },
  );

  it.each(['contribuyente_agropecuario', 'pequeno_contribuyente_electronico'] as const)(
    'el régimen %s no puede iniciar después de la derogación',
    (regimen) => {
      for (const desde of ['2025-08-01', '2026-01-01']) {
        expect(problemasDeLaDerogacion(regimen, desde)).toEqual([
          expect.objectContaining({ campo: 'vigenteDesde', mensaje: expect.stringContaining('Decreto 31-2024') }),
        ]);
      }
    },
  );

  it('los demás regímenes no tienen esa regla', () => {
    expect(problemasDeLaDerogacion('general', '2026-01-01')).toEqual([]);
  });
});
