import { describe, expect, it } from 'vitest';
import {
  avisosDeLaApertura,
  exigirSaldosConMovimientos,
  fechaDeLaApertura,
  tieneMovimientos,
  type HechosDelSaldoInicial,
} from './apertura-de-pagos.js';
import type { DocumentoPorPagar } from './documento-por-pagar.js';
import { CorrijaElSaldoInicial, FechaDeAperturaInvalida } from './errores-de-apertura-de-pagos.js';

const saldo = (cambios: Partial<HechosDelSaldoInicial> = {}): HechosDelSaldoInicial => ({
  documento: { serie: 'S', numero: '1001' } as DocumentoPorPagar,
  aplicadoAlCargoCentavos: 0,
  aplicacionesManualesRecibidas: 0,
  ajustesVigentes: 0,
  notasEnTotal: 0,
  pagosVigentes: [],
  ...cambios,
});

describe('un saldo inicial con movimientos', () => {
  it.each([
    ['una nota aplicada', { aplicadoAlCargoCentavos: 100 }],
    ['una aplicación manual recibida', { aplicacionesManualesRecibidas: 1 }],
    ['un ajuste vigente', { ajustesVigentes: 1 }],
    ['una nota que lo corrige, aunque esté anulada', { notasEnTotal: 1 }],
    ['un pago vigente', { pagosVigentes: [{ fecha: '2026-02-01', montoCentavos: 100 }] }],
  ])('lo tiene con %s', (_caso, cambios) => {
    expect(tieneMovimientos(saldo(cambios))).toBe(true);
  });

  it('no lo tiene sin nada de eso', () => {
    expect(tieneMovimientos(saldo())).toBe(false);
  });

  it('con la carga abierta, uno sin movimientos se rechaza con su etiqueta y los demás pasan', () => {
    expect(() => exigirSaldosConMovimientos([saldo({ ajustesVigentes: 1 })])).not.toThrow();
    expect(() => exigirSaldosConMovimientos([saldo({ ajustesVigentes: 1 }), saldo()])).toThrow(CorrijaElSaldoInicial);
    expect(() => exigirSaldosConMovimientos([saldo()])).toThrow('el saldo inicial S-1001 no tiene movimientos');
  });
});

describe('la fecha de la aplicación a la cuenta de apertura', () => {
  const base = { fechaDeInicio: '2026-01-01', hoy: '2026-03-15' };

  it('con la carga abierta es siempre la fecha de inicio, aunque se mande otra', () => {
    expect(fechaDeLaApertura({ ...base, cargaCerrada: false, fecha: '2026-02-10' })).toBe('2026-01-01');
    expect(fechaDeLaApertura({ ...base, cargaCerrada: false })).toBe('2026-01-01');
  });

  it('con la carga cerrada es hoy por omisión o la elegida, entre la fecha de inicio y hoy', () => {
    expect(fechaDeLaApertura({ ...base, cargaCerrada: true })).toBe('2026-03-15');
    expect(fechaDeLaApertura({ ...base, cargaCerrada: true, fecha: '2026-01-01' })).toBe('2026-01-01');
    expect(fechaDeLaApertura({ ...base, cargaCerrada: true, fecha: '2026-03-15' })).toBe('2026-03-15');
  });

  it('con la carga cerrada rechaza la futura y la anterior a la fecha de inicio', () => {
    expect(() => fechaDeLaApertura({ ...base, cargaCerrada: true, fecha: '2026-03-16' })).toThrow(
      FechaDeAperturaInvalida,
    );
    expect(() => fechaDeLaApertura({ ...base, cargaCerrada: true, fecha: '2025-12-31' })).toThrow(
      'ni anterior al 01/01/2026',
    );
  });
});

describe('los avisos de la cuenta de apertura', () => {
  it('siempre dicen que es solo para lo pagado antes de la fecha de inicio', () => {
    const cabecera = 'Use esta forma solo si el documento ya se había pagado antes de la fecha de inicio.';
    expect(avisosDeLaApertura({ cargaCerrada: false, fechaDeInicio: '2026-01-01' })[0]).toBe(cabecera);
    expect(avisosDeLaApertura({ cargaCerrada: true, fechaDeInicio: '2026-01-01' })[0]).toBe(cabecera);
  });

  it('con la carga abierta nombran la fecha de inicio y la cuenta puente', () => {
    expect(avisosDeLaApertura({ cargaCerrada: false, fechaDeInicio: '2026-01-01' })[1]).toBe(
      'La carga inicial está abierta: se registra con la fecha de inicio (01/01/2026) contra la cuenta puente de apertura.',
    );
  });

  it('con la carga cerrada hablan de una corrección de error y mandan al contador', () => {
    expect(avisosDeLaApertura({ cargaCerrada: true, fechaDeInicio: '2026-01-01' })[1]).toBe(
      'La carga inicial está cerrada: es una corrección de error de períodos anteriores. Avise a su contador, que elige la cuenta.',
    );
  });
});
