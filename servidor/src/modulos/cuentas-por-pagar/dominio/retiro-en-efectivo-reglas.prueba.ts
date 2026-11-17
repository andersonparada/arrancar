import { describe, expect, it } from 'vitest';
import { avisoDelRetiroEnEfectivo } from './avisos-de-retiros.js';
import { RetiroLiquidado } from './errores-de-retiros.js';
import type { PagoConLineas } from './pago-con-lineas.js';
import { retiroAbierto } from './reglas-de-anulacion-de-pagos.js';

const pago = {} as PagoConLineas;

describe('la regla retiroAbierto', () => {
  it('rechaza anular un pago de un retiro liquidado', () => {
    const retiro = { estado: 'liquidado' as const, numero: 4, anioDeNumero: 0 };
    expect(() => retiroAbierto({ pago, conciliado: false, retiro })).toThrow(RetiroLiquidado);
  });

  it('deja pasar un retiro abierto y las formas sin retiro', () => {
    const abierto = { estado: 'abierto' as const, numero: 4, anioDeNumero: 0 };
    expect(() => retiroAbierto({ pago, conciliado: false, retiro: abierto })).not.toThrow();
    expect(() => retiroAbierto({ pago, conciliado: false })).not.toThrow();
  });
});

describe('el aviso al sacar efectivo para pagar proveedores', () => {
  const retiro = { montoCentavos: 3_500_000, umbralCentavos: 3_000_000 };

  it('nombra solo lo que la empresa pierde', () => {
    expect(avisoDelRetiroEnEfectivo(retiro, { iva: true, isr: true })).toContain(
      'el costo para el ISR y el crédito fiscal del IVA',
    );
    expect(avisoDelRetiroEnEfectivo(retiro, { iva: true, isr: false })).not.toContain('ISR');
  });

  it('no avisa bajo el umbral, sin efecto fiscal ni sin datos fiscales', () => {
    expect(avisoDelRetiroEnEfectivo({ ...retiro, montoCentavos: 100 }, { iva: true, isr: true })).toBeNull();
    expect(avisoDelRetiroEnEfectivo(retiro, { iva: false, isr: false })).toBeNull();
    expect(avisoDelRetiroEnEfectivo(retiro, null)).toBeNull();
  });
});
