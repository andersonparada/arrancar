import { describe, expect, it } from 'vitest';
import { marcasDelCargo, tieneEfectoFiscal, type CargoParaMarcar } from './marcas-de-bancarizacion.js';

const delLibro: CargoParaMarcar = {
  totalCentavos: 3_360_000,
  ivaAcreditableCentavos: 360_000,
  ivaCentavos: 360_000,
  esSaldoInicial: false,
  efecto: { iva: true, isr: true },
};

describe('marcasDelCargo', () => {
  it('con IVA y con ISR marca el IVA completo y el cargo sin IVA', () => {
    expect(marcasDelCargo(delLibro)).toMatchObject({
      creditoFiscalEnRiesgo: true,
      ivaEnRiesgoCentavos: 360_000,
      costoNoDeducible: true,
      costoNoDeducibleCentavos: 3_000_000,
      ivaNoConocido: false,
      marcas: ['Crédito fiscal en riesgo por bancarización', 'Costo no deducible'],
    });
  });

  it('el IVA en riesgo es solo lo acreditable', () => {
    const marcas = marcasDelCargo({ ...delLibro, ivaAcreditableCentavos: 100_000, efecto: { iva: true, isr: false } });

    expect(marcas).toMatchObject({
      ivaEnRiesgoCentavos: 100_000,
      costoNoDeducible: false,
      costoNoDeducibleCentavos: 0,
    });
  });

  it('en un saldo inicial no se conoce el IVA: el costo es el neto y se avisa', () => {
    const marcas = marcasDelCargo({
      totalCentavos: 500_000,
      ivaAcreditableCentavos: null,
      ivaCentavos: null,
      esSaldoInicial: true,
      efecto: { iva: true, isr: true },
    });

    expect(marcas).toMatchObject({ ivaEnRiesgoCentavos: 0, costoNoDeducibleCentavos: 500_000, ivaNoConocido: true });
  });

  it('sin efecto o sin datos fiscales no marca nada', () => {
    expect(marcasDelCargo({ ...delLibro, efecto: { iva: false, isr: false } }).marcas).toEqual([]);
    expect(marcasDelCargo({ ...delLibro, efecto: null }).marcas).toEqual([]);
    expect(tieneEfectoFiscal(null)).toBe(false);
    expect(tieneEfectoFiscal({ iva: false, isr: true })).toBe(true);
  });
});
