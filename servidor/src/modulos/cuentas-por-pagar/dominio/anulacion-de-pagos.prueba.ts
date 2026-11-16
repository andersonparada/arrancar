import { describe, expect, it } from 'vitest';
import {
  efectoDelPago,
  exigirElMismoMonto,
  exigirFechaDeDiferencia,
  exigirSoloSaldosInicialesEnLaApertura,
  fechaDeAnulacionDelPago,
} from './anulacion-de-pagos.js';
import {
  FechaDeDiferenciaInvalida,
  ReaplicacionConOtroMonto,
  SoloSaldosIniciales,
} from './errores-de-anulacion-de-pagos.js';

describe('la fecha contable de la anulación de un pago', () => {
  const pago = { fecha: '2026-03-10' };

  it('sin inverso en Bancos es la fecha del pago: nunca existió', () => {
    const datos = { enBancos: 'sin_inverso' as const, fechaDelInverso: null, hoy: '2026-05-01' };
    expect(fechaDeAnulacionDelPago(pago, datos)).toBe('2026-03-10');
  });

  it('con inverso es la fecha del inverso, no la del pago ni la de hoy', () => {
    const datos = { enBancos: 'con_inverso' as const, fechaDelInverso: '2026-04-02', hoy: '2026-05-01' };
    expect(fechaDeAnulacionDelPago(pago, datos)).toBe('2026-04-02');
  });

  it('sin movimiento en Bancos es hoy, y nunca antes de la fecha del pago', () => {
    const sinBancos = { enBancos: null, fechaDelInverso: null, hoy: '2026-05-01' };
    expect(fechaDeAnulacionDelPago(pago, sinBancos)).toBe('2026-05-01');
    expect(fechaDeAnulacionDelPago({ fecha: '2026-06-01' }, sinBancos)).toBe('2026-06-01');
  });
});

describe('el efecto del pago para Contabilidad', () => {
  it('sale de la forma y, en la cuenta de apertura, de si la carga estaba cerrada', () => {
    expect(efectoDelPago({ forma: 'cheque', conCargaCerrada: null })).toBe('banco');
    expect(efectoDelPago({ forma: 'nota_de_debito', conCargaCerrada: null })).toBe('banco');
    expect(efectoDelPago({ forma: 'nota_ligada', conCargaCerrada: null })).toBe('transitoria_por_aplicar');
    expect(efectoDelPago({ forma: 'efectivo', conCargaCerrada: null })).toBe('efectivo');
    expect(efectoDelPago({ forma: 'cuenta_de_apertura', conCargaCerrada: false })).toBe('apertura');
    expect(efectoDelPago({ forma: 'cuenta_de_apertura', conCargaCerrada: true })).toBe('correccion_de_error');
  });
});

describe('las reglas de reaplicar y de saldar la diferencia', () => {
  it('el dinero del pago no cambia', () => {
    exigirElMismoMonto({ montoCentavos: 1000 }, [{ montoCentavos: 600 }, { montoCentavos: 400 }]);
    expect(() => exigirElMismoMonto({ montoCentavos: 1000 }, [{ montoCentavos: 999 }])).toThrow(
      ReaplicacionConOtroMonto,
    );
  });

  it('la cuenta de apertura solo cubre saldos iniciales', () => {
    exigirSoloSaldosInicialesEnLaApertura({ forma: 'cuenta_de_apertura' }, ['saldo_inicial']);
    exigirSoloSaldosInicialesEnLaApertura({ forma: 'cheque' }, ['libro_de_compras']);
    expect(() => exigirSoloSaldosInicialesEnLaApertura({ forma: 'cuenta_de_apertura' }, ['libro_de_compras'])).toThrow(
      SoloSaldosIniciales,
    );
  });

  it('la diferencia se salda desde la fecha del pago hasta hoy', () => {
    const limites = { fechaDelPago: '2026-03-10', hoy: '2026-05-01' };
    exigirFechaDeDiferencia('2026-03-10', limites);
    exigirFechaDeDiferencia('2026-05-01', limites);
    expect(() => exigirFechaDeDiferencia('2026-03-09', limites)).toThrow(FechaDeDiferenciaInvalida);
    expect(() => exigirFechaDeDiferencia('2026-05-02', limites)).toThrow(FechaDeDiferenciaInvalida);
  });
});
