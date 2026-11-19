import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { ChequeListado } from '../../servicios/cheques.api';
import { detallesDeChequeListado, insigniaDeChequeListado, tituloDeChequeListado } from './detalles-de-cheque-listado';

// `detallesDeChequeListado` da formato con `formatearFecha`, que lee la sesión (Pinia).
beforeEach(() => setActivePinia(createPinia()));

const base: ChequeListado = {
  id: 'cheque-1',
  chequeraId: 'chequera-1',
  numero: 7,
  serie: 'A',
  cuentaBancariaId: 'cuenta-1',
  cuentaBancariaNombre: 'Cuenta monetaria',
  estado: 'emitido',
  noNegociable: true,
  paraAbonoEnCuenta: false,
  fecha: '2026-09-27',
  monto: '150.00',
  beneficiario: 'Un proveedor',
  referencia: 'Cheque A7',
  anuladoEn: null,
  motivoDeAnulacion: null,
  causaDeAnulacion: null,
  aviso: null,
  impresoEn: null,
  moduloDeOrigen: null,
  puedeAnular: true,
  puedeBlanquear: true,
  puedeImprimir: true,
  puedeReimprimir: false,
  puedePasarAOtroFormulario: false,
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
      causaDeAnulacion: 'caducidad',
    });
    expect(detalles).toContainEqual({ etiqueta: 'Motivo de anulación', valor: 'Se perdió' });
    expect(detalles).toContainEqual({ etiqueta: 'Causa de anulación', valor: 'Por caducidad' });
  });

  it('agrega «Para abono en cuenta» solo si el cheque lo lleva', () => {
    expect(detallesDeChequeListado({ ...base, paraAbonoEnCuenta: true })).toContainEqual({
      etiqueta: 'Para abono en cuenta',
      valor: 'Sí',
    });
    expect(detallesDeChequeListado(base).map((d) => d.etiqueta)).not.toContain('Para abono en cuenta');
  });

  it('agrega cuándo se imprimió solo si ya se imprimió', () => {
    expect(detallesDeChequeListado(base).map((d) => d.etiqueta)).not.toContain('Impreso');
    expect(
      detallesDeChequeListado({ ...base, impresoEn: '2026-09-27T10:00:00.000Z' }).map((d) => d.etiqueta),
    ).toContain('Impreso');
  });

  it('sin motivo de anulación no lo agrega', () => {
    expect(detallesDeChequeListado(base).map((d) => d.etiqueta)).not.toContain('Motivo de anulación');
  });

  it('dice el módulo que lo generó y lo calla si nació en Bancos', () => {
    expect(detallesDeChequeListado({ ...base, moduloDeOrigen: 'cuentas-por-pagar' })).toContainEqual({
      etiqueta: 'Origen',
      valor: 'Cuentas por pagar',
    });
    expect(detallesDeChequeListado(base).map((d) => d.etiqueta)).not.toContain('Origen');
  });
});

describe('insignia del cheque listado', () => {
  it('un emitido sin imprimir no lleva marca y uno impreso dice «Impreso»', () => {
    expect(insigniaDeChequeListado(base)).toBeUndefined();
    expect(insigniaDeChequeListado({ ...base, impresoEn: '2026-09-27T10:00:00.000Z' })).toBe('Impreso');
  });

  it('un anulado dice cómo terminó: inutilizado, extraviado o anulado', () => {
    const anulado = { ...base, estado: 'anulado' as const };
    expect(insigniaDeChequeListado({ ...anulado, causaDeAnulacion: 'inutilizado' })).toBe('Inutilizado');
    expect(insigniaDeChequeListado({ ...anulado, causaDeAnulacion: 'extraviado' })).toBe('Extraviado');
    expect(insigniaDeChequeListado({ ...anulado, causaDeAnulacion: 'manual' })).toBe('Anulado');
    expect(insigniaDeChequeListado({ ...anulado, causaDeAnulacion: null })).toBe('Anulado');
  });

  it('el aviso del extraviado sale en los detalles, a lo ancho', () => {
    const detalles = detallesDeChequeListado({ ...base, aviso: 'Avise al banco por escrito.' });
    expect(detalles).toContainEqual({ etiqueta: 'Aviso', valor: 'Avise al banco por escrito.', largo: true });
  });
});
