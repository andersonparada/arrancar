import { describe, expect, it } from 'vitest';
import { errorDeMeses, filtroDeLaConsulta, filtrosPorOmision, mesesEscritos } from './filtros-de-cheques-caducos';

describe('meses escritos en el filtro', () => {
  it.each([
    ['7', 7],
    [' 12 ', 12],
    ['1', 1],
    ['120', 120],
  ])('«%s» son %i meses', (texto, esperados) => {
    expect(mesesEscritos(texto)).toBe(esperados);
  });

  it.each([[''], ['  '], ['0'], ['121'], ['2.5'], ['abc'], ['-3']])('«%s» no sirve', (texto) => {
    expect(mesesEscritos(texto)).toBeUndefined();
  });
});

describe('mensaje de error de los meses', () => {
  it('vacío o válido no da error', () => {
    expect(errorDeMeses('')).toBeUndefined();
    expect(errorDeMeses('8')).toBeUndefined();
  });

  it('un valor inválido dice cómo corregirlo', () => {
    expect(errorDeMeses('0')).toBe('Escribe un número entero de meses entre 1 y 120, o déjalo vacío.');
  });
});

describe('filtro de cheques caducos para el servidor', () => {
  it('sin elegir nada no manda nada', () => {
    expect(filtroDeLaConsulta(filtrosPorOmision())).toEqual({
      cuentaBancariaId: undefined,
      beneficiario: undefined,
      meses: undefined,
    });
  });

  it('manda la cuenta, el beneficiario sin espacios sobrantes y los meses como número', () => {
    expect(filtroDeLaConsulta({ cuentaBancariaId: 'c-1', beneficiario: '  Ana  ', meses: '9' })).toEqual({
      cuentaBancariaId: 'c-1',
      beneficiario: 'Ana',
      meses: 9,
    });
  });

  it('no manda unos meses inválidos', () => {
    expect(filtroDeLaConsulta({ cuentaBancariaId: null, beneficiario: '', meses: '500' }).meses).toBeUndefined();
  });
});
