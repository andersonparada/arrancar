import { describe, expect, it } from 'vitest';
import { etiquetaDelComprobante } from './comprobantes.js';
import {
  efectoEnLoPendiente,
  exigirFechaDelComprobante,
  exigirMontoPositivo,
  exigirQueAlcanceElEfectivo,
  topeVigente,
} from './reglas-de-comprobantes.js';

describe('topeVigente', () => {
  it('manda el del fondo; sin él, el de la empresa; cero es sin tope', () => {
    expect(topeVigente(30_000, 200_000)).toBe(30_000);
    expect(topeVigente(null, 200_000)).toBe(200_000);
    expect(topeVigente(null, 0)).toBeNull();
  });
});

describe('efectoEnLoPendiente', () => {
  it('un cargo suma y una nota de crédito o un sobrante restan', () => {
    expect(efectoEnLoPendiente({ montoCentavos: 5_000, resta: false })).toBe(5_000);
    expect(efectoEnLoPendiente({ montoCentavos: 5_000, resta: true })).toBe(-5_000);
  });
});

describe('exigirMontoPositivo', () => {
  it('rechaza cero y negativos', () => {
    expect(exigirMontoPositivo(1)).toBe(1);
    expect(() => exigirMontoPositivo(0)).toThrow('Escriba el monto');
    expect(() => exigirMontoPositivo(-5)).toThrow('Escriba el monto');
  });
});

describe('exigirFechaDelComprobante', () => {
  const contexto = { hoy: '2026-11-18', fechaDeApertura: '2026-11-01' };

  it('acepta desde la apertura hasta hoy, ambos días incluidos', () => {
    expect(() => exigirFechaDelComprobante('2026-11-01', contexto)).not.toThrow();
    expect(() => exigirFechaDelComprobante('2026-11-18', contexto)).not.toThrow();
  });

  it('rechaza una fecha futura o anterior a la apertura', () => {
    expect(() => exigirFechaDelComprobante('2026-11-19', contexto)).toThrow('no puede ser futura');
    expect(() => exigirFechaDelComprobante('2026-10-31', contexto)).toThrow('anterior a la apertura');
  });
});

describe('exigirQueAlcanceElEfectivo', () => {
  it('con lo justo pasa; un centavo más no, y dice cuánto se pasa', () => {
    expect(() => exigirQueAlcanceElEfectivo(10_000, 10_000)).not.toThrow();
    expect(() => exigirQueAlcanceElEfectivo(10_000, 10_001)).toThrow(/Q\s0\.01 más de lo que tiene/);
  });

  it('lo que resta nunca falla, y sacar algo que resta sí puede', () => {
    expect(() => exigirQueAlcanceElEfectivo(0, -5_000)).not.toThrow();
    expect(() => exigirQueAlcanceElEfectivo(1_000, 5_000)).toThrow(/Q\s40\.00/);
  });
});

describe('etiquetaDelComprobante', () => {
  it('nombra el documento por serie y número, y el vale por su número', () => {
    const documento = {
      tipo: 'factura',
      serie: 'A',
      numero: '12',
      proveedorNombre: 'x',
      fechaEmision: '2026-11-18',
      totalCentavos: 1,
      enElLibro: true,
      motivoFueraDelLibro: null,
    };

    expect(etiquetaDelComprobante({ clase: 'documento', numero: null, documento })).toBe('A-12');
    expect(etiquetaDelComprobante({ clase: 'documento', numero: null, documento: { ...documento, serie: null } })).toBe(
      '12',
    );
    expect(etiquetaDelComprobante({ clase: 'vale_de_gasto', numero: 5, documento: null })).toBe('vale 5');
  });
});
