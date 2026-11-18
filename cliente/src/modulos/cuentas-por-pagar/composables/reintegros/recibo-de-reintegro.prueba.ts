import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { descripcionDelMedio, etiquetaDeLaNota, lineasDeLaEmpresa, tituloDelRecibo } from './recibo-de-reintegro';

beforeEach(() => setActivePinia(createPinia()));

describe('descripcionDelMedio', () => {
  it('describe el depósito con su cuenta y su boleta', () => {
    expect(descripcionDelMedio({ forma: 'deposito', cuentaBancaria: 'Cuenta monetaria', referencia: '8841' })).toBe(
      'Depósito en Cuenta monetaria. Boleta: 8841',
    );
  });

  it('describe el efectivo con la referencia de su recibo', () => {
    expect(descripcionDelMedio({ forma: 'efectivo', cuentaBancaria: null, referencia: 'RC-15' })).toBe(
      'Efectivo. Recibo de caja o boleta: RC-15',
    );
  });

  it('no inventa lo que falta', () => {
    expect(descripcionDelMedio({ forma: 'deposito', cuentaBancaria: null, referencia: null })).toBe('Depósito');
  });
});

describe('textos del recibo', () => {
  it('lee la nota con o sin serie', () => {
    expect(etiquetaDeLaNota({ serie: 'A', numero: '45' })).toBe('A-45');
    expect(etiquetaDeLaNota({ serie: null, numero: '45' })).toBe('45');
  });

  it('pone el comercial solo si es distinto de la razón social', () => {
    const base = { nombre: 'Finca', nit: null, razonSocial: 'Finca, S. A.', nombreComercial: 'Finca' };
    expect(lineasDeLaEmpresa(base)).toEqual({ principal: 'Finca, S. A.', comercial: 'Finca' });
    expect(lineasDeLaEmpresa({ ...base, nombreComercial: 'Finca, S. A.' }).comercial).toBeNull();
    expect(lineasDeLaEmpresa({ ...base, razonSocial: null, nombreComercial: null }).principal).toBe('Finca');
  });

  it('titula el archivo con el número del recibo', () => {
    expect(tituloDelRecibo({ numero: '2026-15', fecha: '2026-11-15' })).toContain('2026-15');
  });
});
