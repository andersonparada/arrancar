import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { ChequeListado } from '../../servicios/cheques.api';
import { detallesDeChequeListado, tituloDeChequeListado } from './detalles-de-cheque-listado';

// `detallesDeChequeListado` da formato con `formatearFecha`, que lee la sesión (Pinia).
beforeEach(() => setActivePinia(createPinia()));

const base: ChequeListado = {
  id: 'cheque-1',
  numero: 7,
  serie: 'A',
  cuentaBancariaId: 'cuenta-1',
  cuentaBancariaNombre: 'Cuenta monetaria',
  estado: 'emitido',
  noNegociable: true,
  fecha: '2026-09-27',
  monto: '150.00',
  beneficiario: 'Un proveedor',
  referencia: 'Cheque A7',
  anuladoEn: null,
  motivoDeAnulacion: null,
};

describe('título del cheque listado', () => {
  it('es "Cheque No. <serie><número>"', () => {
    expect(tituloDeChequeListado(base)).toBe('Cheque No. A7');
  });

  it('sin serie, solo el número', () => {
    expect(tituloDeChequeListado({ ...base, serie: null })).toBe('Cheque No. 7');
  });
});

describe('detalles del cheque listado', () => {
  it('lleva cuenta, fecha, beneficiario, referencia y si es no negociable', () => {
    const detalles = detallesDeChequeListado(base);
    expect(detalles.map((d) => d.etiqueta)).toEqual(['Cuenta', 'Fecha', 'Beneficiario', 'Referencia', 'No negociable']);
  });

  it('agrega el motivo de anulación solo cuando está anulado', () => {
    const detalles = detallesDeChequeListado({
      ...base,
      estado: 'anulado',
      anuladoEn: '2026-09-27T10:00:00.000Z',
      motivoDeAnulacion: 'Se perdió',
    });
    expect(detalles).toContainEqual({ etiqueta: 'Motivo de anulación', valor: 'Se perdió' });
  });

  it('sin motivo de anulación no lo agrega', () => {
    expect(detallesDeChequeListado(base).map((d) => d.etiqueta)).not.toContain('Motivo de anulación');
  });
});
