import { describe, expect, it } from 'vitest';
import { proponerVencimiento, sumarDias, sumarMeses } from './propuesta-de-vencimiento.js';

describe('propuesta de vencimiento', () => {
  describe('con días de crédito del proveedor', () => {
    it('suma los días a la fecha de emisión', () => {
      const vencimiento = proponerVencimiento({ fechaEmision: '2026-03-10', diasDeCredito: 15, mesesPorOmision: 1 });

      expect(vencimiento).toBe('2026-03-25');
    });

    it('con 0 días es de contado: vence el mismo día', () => {
      const vencimiento = proponerVencimiento({ fechaEmision: '2026-03-10', diasDeCredito: 0, mesesPorOmision: 1 });

      expect(vencimiento).toBe('2026-03-10');
    });

    it('cruza el fin de mes y el cambio de año', () => {
      expect(sumarDias('2026-12-20', 30)).toBe('2027-01-19');
      expect(sumarDias('2026-02-20', 10)).toBe('2026-03-02');
    });

    it('con 365 días llega al mismo día del año siguiente', () => {
      expect(sumarDias('2026-03-10', 365)).toBe('2027-03-10');
    });

    it('los días del proveedor mandan sobre los meses por omisión', () => {
      const vencimiento = proponerVencimiento({ fechaEmision: '2026-03-10', diasDeCredito: 5, mesesPorOmision: 6 });

      expect(vencimiento).toBe('2026-03-15');
    });
  });

  describe('sin días de crédito: el plazo por omisión', () => {
    it('es un mes calendario desde la emisión', () => {
      const vencimiento = proponerVencimiento({ fechaEmision: '2026-03-10', diasDeCredito: null, mesesPorOmision: 1 });

      expect(vencimiento).toBe('2026-04-10');
    });

    it('el día se ajusta al fin de mes: 31 de enero va al 28 de febrero', () => {
      expect(sumarMeses('2026-01-31', 1)).toBe('2026-02-28');
      expect(sumarMeses('2026-03-31', 1)).toBe('2026-04-30');
    });

    it('en año bisiesto, 31 de enero va al 29 de febrero', () => {
      expect(sumarMeses('2028-01-31', 1)).toBe('2028-02-29');
      expect(sumarMeses('2028-01-29', 1)).toBe('2028-02-29');
    });

    it('cruza el cambio de año', () => {
      expect(sumarMeses('2026-12-15', 1)).toBe('2027-01-15');
      expect(sumarMeses('2026-11-30', 3)).toBe('2027-02-28');
    });

    it('con 0 meses es de contado y con 12 llega al mismo día del año siguiente', () => {
      expect(sumarMeses('2026-03-10', 0)).toBe('2026-03-10');
      expect(sumarMeses('2026-03-10', 12)).toBe('2027-03-10');
      expect(sumarMeses('2028-02-29', 12)).toBe('2029-02-28');
    });
  });
});
