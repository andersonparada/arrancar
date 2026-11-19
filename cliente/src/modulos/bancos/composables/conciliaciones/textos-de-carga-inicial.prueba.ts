import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { avisoDeCheque, esFinDeMes, rotuloDelSaldoInicialDelBanco } from './textos-de-carga-inicial';

describe('textos de la carga inicial en la conciliación', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('reconoce el fin de mes, también en bisiesto y fin de año', () => {
    expect(esFinDeMes('2026-12-31')).toBe(true);
    expect(esFinDeMes('2028-02-29')).toBe(true);
    expect(esFinDeMes('2026-02-28')).toBe(true);
    expect(esFinDeMes('2028-02-28')).toBe(false);
    expect(esFinDeMes('2026-01-15')).toBe(false);
    expect(esFinDeMes('')).toBe(false);
  });

  it('rotula el saldo anterior si el corte es fin de mes', () => {
    expect(rotuloDelSaldoInicialDelBanco('2026-12-31')).toContain('Saldo anterior del estado de cuenta');
    expect(rotuloDelSaldoInicialDelBanco('2026-12-31')).toContain('31/12/2026');
  });

  it('rotula el saldo del banco al corte si es a mitad de mes', () => {
    expect(rotuloDelSaldoInicialDelBanco('2026-01-14')).toBe('Saldo del banco al 14/01/2026 (carga inicial)');
  });

  it('el aviso del posfechado trae su fecha', () => {
    expect(avisoDeCheque('2026-02-10')).toBe('Cheque con fecha 10/02/2026: márquelo solo si el banco ya lo pagó');
  });
});
