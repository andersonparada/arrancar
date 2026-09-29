import { describe, expect, it } from 'vitest';
import { mesesCompletos, nivelDeAntiguedad, numeroDeChequeConSerie, textoDeAntiguedad } from './antiguedad-de-cheques';

describe('nivel de antigüedad', () => {
  it.each([
    [1, 'vencido'],
    [365, 'vencido'],
    [366, 'muy-vencido'],
    [900, 'muy-vencido'],
  ] as const)('%i días es %s', (dias, esperado) => {
    expect(nivelDeAntiguedad(dias)).toBe(esperado);
  });
});

describe('texto de antigüedad', () => {
  it.each([
    [0, 0],
    [29, 0],
    [31, 1],
    [262, 8],
    [365, 11],
    [366, 12],
  ])('%i días son %i meses completos', (dias, meses) => {
    expect(mesesCompletos(dias)).toBe(meses);
  });

  it('escribe los días y los meses, en singular cuando es uno', () => {
    expect(textoDeAntiguedad(271)).toEqual({ dias: '271 días', meses: '8 meses' });
    expect(textoDeAntiguedad(1)).toEqual({ dias: '1 día', meses: '0 meses' });
    expect(textoDeAntiguedad(31)).toEqual({ dias: '31 días', meses: '1 mes' });
  });
});

describe('número de cheque', () => {
  it('lleva la serie cuando la chequera la tiene', () => {
    expect(numeroDeChequeConSerie({ serie: 'A', numero: 1042 })).toBe('A-1042');
    expect(numeroDeChequeConSerie({ serie: null, numero: 1042 })).toBe('1042');
  });
});
