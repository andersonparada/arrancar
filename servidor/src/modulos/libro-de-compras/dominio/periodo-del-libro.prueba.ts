import { describe, expect, it } from 'vitest';
import { PeriodoInvalido } from './errores-de-calculo.js';
import {
  esFueraDePlazo,
  exigirPeriodoValido,
  periodoPropuesto,
  primerDiaDelMes,
  sumarMeses,
  ultimoPeriodoConCredito,
} from './periodo-del-libro.js';

describe('fechas del libro', () => {
  it.each([
    ['2026-03-17', '2026-03-01'],
    ['2026-12-31', '2026-12-01'],
  ])('el primer día del mes de %s es %s', (fecha, esperado) => {
    expect(primerDiaDelMes(fecha)).toBe(esperado);
  });

  it.each([
    ['2026-11-20', 2, '2027-01-01'],
    ['2026-01-31', 1, '2026-02-01'],
    ['2026-12-31', 2, '2027-02-01'],
    ['2026-01-10', -1, '2025-12-01'],
    ['2026-05-10', 0, '2026-05-01'],
  ])('%s más %i meses es %s', (fecha, meses, esperado) => {
    expect(sumarMeses(fecha, meses)).toBe(esperado);
  });

  it.each(['2026-02-30', '2026-13-01', '26-01-01', 'hoy', ''])('rechaza la fecha %j', (fecha) => {
    expect(() => primerDiaDelMes(fecha)).toThrow(PeriodoInvalido);
  });
});

describe('plazo del crédito (art. 20): el mes de emisión y los dos siguientes', () => {
  it('la factura de enero se reporta hasta marzo', () => {
    expect(ultimoPeriodoConCredito('2026-01-15')).toBe('2026-03-01');
    expect(esFueraDePlazo('2026-01-01', '2026-01-15')).toBe(false);
    expect(esFueraDePlazo('2026-03-01', '2026-01-31')).toBe(false);
    expect(esFueraDePlazo('2026-04-01', '2026-01-01')).toBe(true);
  });

  it('cruza el año: la de diciembre llega hasta febrero', () => {
    expect(ultimoPeriodoConCredito('2026-12-31')).toBe('2027-02-01');
    expect(esFueraDePlazo('2027-02-01', '2026-12-31')).toBe(false);
    expect(esFueraDePlazo('2027-03-01', '2026-12-31')).toBe(true);
  });
});

describe('periodoPropuesto', () => {
  it('es el mes de recepción para facturas y notas', () => {
    const base = { fechaDeEmision: '2026-01-15', fechaDeRecepcion: '2026-02-10' };
    expect(periodoPropuesto({ ...base, tipo: 'factura' })).toBe('2026-02-01');
    expect(periodoPropuesto({ ...base, tipo: 'nota_de_credito' })).toBe('2026-02-01');
  });

  it('una factura recibida el mismo mes va en ese mes', () => {
    expect(periodoPropuesto({ tipo: 'factura', fechaDeEmision: '2026-01-02', fechaDeRecepcion: '2026-01-31' })).toBe(
      '2026-01-01',
    );
  });

  it('nunca queda antes del mes de emisión (recepción con fecha atrasada)', () => {
    expect(periodoPropuesto({ tipo: 'factura', fechaDeEmision: '2026-03-02', fechaDeRecepcion: '2026-02-10' })).toBe(
      '2026-03-01',
    );
  });
});

describe('exigirPeriodoValido', () => {
  const fechas = {
    tipo: 'factura' as const,
    fechaDeEmision: '2026-01-15',
    fechaDeRecepcion: '2026-01-20',
    periodo: '2026-01-01',
  };

  it('acepta el mes de emisión, los dos siguientes y hasta uno más lejano (será fuera de plazo)', () => {
    for (const periodo of ['2026-01-01', '2026-02-01', '2026-03-01', '2026-09-01']) {
      expect(() => exigirPeriodoValido({ ...fechas, periodo })).not.toThrow();
    }
  });

  it.each([
    ['el período no es primer día', { periodo: '2026-01-15' }],
    ['el período es anterior a la emisión', { periodo: '2025-12-01' }],
    ['la recepción es anterior a la emisión', { fechaDeRecepcion: '2026-01-14' }],
    ['la fecha de emisión no existe', { fechaDeEmision: '2026-02-30' }],
    ['la nota no va en el mes de recepción', { tipo: 'nota_de_credito' as const, periodo: '2026-02-01' }],
    ['la nota va antes del mes de recepción', { tipo: 'nota_de_credito' as const, fechaDeRecepcion: '2026-03-02' }],
  ])('rechaza si %s', (_caso, cambios) => {
    expect(() => exigirPeriodoValido({ ...fechas, ...cambios })).toThrow(PeriodoInvalido);
  });

  it('la nota de crédito va exactamente en su mes de recepción', () => {
    expect(() =>
      exigirPeriodoValido({
        ...fechas,
        tipo: 'nota_de_credito',
        fechaDeRecepcion: '2026-05-10',
        periodo: '2026-05-01',
      }),
    ).not.toThrow();
  });
});
