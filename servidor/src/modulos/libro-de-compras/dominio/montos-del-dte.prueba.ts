import { describe, expect, it } from 'vitest';
import { ExentoNegativoDelDte } from './errores-de-bandeja.js';
import { montosPropuestosDelDte, type MontosDelDte } from './montos-del-dte.js';
import type { TipoDte } from './tipos-de-documento.js';

const TASA = 1200;

const montos = (cambios: Partial<MontosDelDte> = {}): MontosDelDte => ({
  tipoDte: 'FACT',
  total: '1120.00',
  iva: '120.00',
  idp: '0.00',
  otrosImpuestos: '0.00',
  ...cambios,
});

describe('exento deducido del resumen de la SAT', () => {
  it('con el IVA que corresponde al total no hay exento y el IVA de la FEL se manda para corregir', () => {
    const resultado = montosPropuestosDelDte(montos(), TASA);

    expect(resultado).toEqual({ idp: null, otrosImpuestos: null, exento: '0.00', ivaDeLaFel: '120.00', avisos: [] });
  });

  it.each(['119.96', '120.04'])('un IVA de %s se aparta cuatro centavos y cabe en la tolerancia', (iva) => {
    expect(montosPropuestosDelDte(montos({ iva }), TASA).exento).toBe('0.00');
  });

  it('un IVA que se aparta justo cinco centavos todavía cabe; seis ya no', () => {
    expect(montosPropuestosDelDte(montos({ iva: '120.05' }), TASA).exento).toBe('0.00');
    expect(() => montosPropuestosDelDte(montos({ iva: '120.06' }), TASA)).toThrow(ExentoNegativoDelDte);
  });

  it('un IVA menor que el del total deduce el exento y avisa', () => {
    const resultado = montosPropuestosDelDte(montos({ iva: '108.00' }), TASA);

    expect(resultado.exento).toBe('112.00');
    expect(resultado.ivaDeLaFel).toBe('108.00');
    expect(resultado.avisos).toEqual(['Se dedujo un exento de Q112.00: revise la factura.']);
  });

  it('sin IVA toda la factura es exento', () => {
    const resultado = montosPropuestosDelDte(montos({ iva: '0.00' }), TASA);

    expect(resultado.exento).toBe('1120.00');
    expect(resultado.avisos).toHaveLength(1);
  });

  it('el IDP y los otros impuestos salen del total antes de comparar el IVA', () => {
    const resultado = montosPropuestosDelDte(
      montos({ total: '1370.00', iva: '120.00', idp: '150.00', otrosImpuestos: '100.00' }),
      TASA,
    );

    expect(resultado).toMatchObject({ idp: '150.00', otrosImpuestos: '100.00', exento: '0.00' });
  });

  it('un IVA mayor que el del total no se puede deducir: el exento sería negativo', () => {
    expect(() => montosPropuestosDelDte(montos({ iva: '240.00' }), TASA)).toThrow(ExentoNegativoDelDte);
  });
});

describe('lo que no se deduce', () => {
  it.each<TipoDte>(['FPEQ', 'FCAP', 'FARP', 'FPEC'])(
    'la familia sin IVA (%s) no deduce nada ni corrige IVA',
    (tipoDte) => {
      const resultado = montosPropuestosDelDte(montos({ tipoDte, iva: '0.00' }), TASA);

      expect(resultado).toMatchObject({ exento: '0.00', ivaDeLaFel: null, avisos: [] });
    },
  );

  it.each<TipoDte>(['RECI', 'RDON'])('el recibo %s no tiene IVA', (tipoDte) => {
    expect(montosPropuestosDelDte(montos({ tipoDte, iva: '0.00' }), TASA)).toMatchObject({
      exento: '0.00',
      ivaDeLaFel: null,
    });
  });

  it('una nota manda su IVA pero no deduce exento', () => {
    const resultado = montosPropuestosDelDte(montos({ tipoDte: 'NCRE', iva: '108.00' }), TASA);

    expect(resultado).toMatchObject({ exento: '0.00', ivaDeLaFel: '108.00', avisos: [] });
  });
});
