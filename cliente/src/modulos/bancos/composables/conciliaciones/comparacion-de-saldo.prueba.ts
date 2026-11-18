import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { compararSaldo, faltaParaTerminar, normalizarMonto, textoDeDiferencia } from './comparacion-de-saldo';

beforeEach(() => setActivePinia(createPinia()));

describe('normalizarMonto', () => {
  it('quita comas, espacios y la Q', () => {
    expect(normalizarMonto(' Q 1,250.50 ')).toBe('1250.50');
  });
  it('acepta negativos y enteros', () => {
    expect(normalizarMonto('-15')).toBe('-15');
  });
  it('rechaza vacío, texto y tres decimales', () => {
    expect(normalizarMonto('')).toBeNull();
    expect(normalizarMonto('abc')).toBeNull();
    expect(normalizarMonto('1.234')).toBeNull();
  });
});

describe('compararSaldo', () => {
  it('sin saldo si es null, vacío o inválido', () => {
    expect(compararSaldo(null, '10.00')).toEqual({ estado: 'sin_saldo' });
    expect(compararSaldo('', '10.00')).toEqual({ estado: 'sin_saldo' });
    expect(compararSaldo('x', '10.00')).toEqual({ estado: 'sin_saldo' });
  });
  it('coincide aunque los decimales se escriban distinto', () => {
    expect(compararSaldo('1250.5', '1250.50')).toEqual({ estado: 'coincide' });
  });
  it('difiere con calculado menos transcrito, sin errores de punto flotante', () => {
    expect(compararSaldo('0.10', '0.30')).toEqual({ estado: 'difiere', diferencia: '0.20' });
    expect(compararSaldo('100.00', '99.50')).toEqual({ estado: 'difiere', diferencia: '-0.50' });
  });
  it('maneja saldos negativos', () => {
    expect(compararSaldo('-5.00', '-5.00')).toEqual({ estado: 'coincide' });
  });
});

describe('faltaParaTerminar', () => {
  const base = { saldoEstadoDeCuenta: null, saldoQueDebeMostrarElEstadoDeCuenta: '100.00', estadoDeCuenta: null };
  it('pide el saldo si no hay', () => {
    expect(faltaParaTerminar(base)).toHaveLength(1);
  });
  it('avisa si difiere', () => {
    expect(faltaParaTerminar({ ...base, saldoEstadoDeCuenta: '90.00' })[0]).toContain('no coincide');
  });
  it('vacío si coincide', () => {
    expect(faltaParaTerminar({ ...base, saldoEstadoDeCuenta: '100' })).toEqual([]);
  });
  it('pide el archivo solo si la empresa lo exige', () => {
    const conSaldo = { ...base, saldoEstadoDeCuenta: '100' };
    expect(faltaParaTerminar(conSaldo, true)).toEqual(['Adjunte el estado de cuenta (PDF o foto) del banco.']);
    expect(faltaParaTerminar(conSaldo, false)).toEqual([]);
  });
  it('no lo pide si ya está adjunto', () => {
    expect(faltaParaTerminar({ ...base, saldoEstadoDeCuenta: '100', estadoDeCuenta: {} }, true)).toEqual([]);
  });
  it('junta varios motivos', () => {
    expect(faltaParaTerminar(base, true)).toHaveLength(2);
  });
});

describe('textoDeDiferencia', () => {
  const sinEspacioDuro = (texto: string): string => texto.replaceAll('\u00a0', ' ');

  it('con el banco por encima del calculado no muestra monto negativo', () => {
    const texto = sinEspacioDuro(textoDeDiferencia('-33.00'));
    expect(texto).toContain('Difiere en Q 33.00');
    expect(texto).toContain('muestra Q 33.00 más');
    expect(texto).not.toContain('-');
  });

  it('con el banco por debajo del calculado dice menos', () => {
    expect(sinEspacioDuro(textoDeDiferencia('0.20'))).toContain('muestra Q 0.20 menos');
  });
});
