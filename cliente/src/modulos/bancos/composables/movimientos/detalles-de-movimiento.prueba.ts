import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Movimiento } from '../../servicios/movimientos.api';
import { CLASE_DE_TIPO, SIGNO_DE_TIPO, detallesDeMovimiento, tituloDeMovimiento } from './detalles-de-movimiento';

// `detallesDeMovimiento` da formato con `formatearFecha`, que lee la sesión (Pinia).
beforeEach(() => setActivePinia(createPinia()));

const base: Movimiento = {
  id: 'registro-1',
  cuentaBancariaId: 'cuenta-1',
  tipo: 'credito',
  fecha: '2026-09-27',
  monto: '1250.50',
  saldoInicial: false,
  referencia: 'Boleta 123',
  beneficiario: 'Un cliente',
  observaciones: null,
  cuentaBancariaNombre: 'Cuenta monetaria',
  anuladoEn: null,
  motivoDeAnulacion: null,
  transferenciaId: null,
  chequeId: null,
  numeroDeCheque: null,
  conciliacionId: null,
};

describe('título del movimiento', () => {
  it('es "Nota de crédito" o "Nota de débito" según el tipo', () => {
    expect(tituloDeMovimiento({ tipo: 'credito', saldoInicial: false, numeroDeCheque: null })).toBe('Nota de crédito');
    expect(tituloDeMovimiento({ tipo: 'debito', saldoInicial: false, numeroDeCheque: null })).toBe('Nota de débito');
  });

  it('es "Saldo inicial" cuando lo es, sin importar el tipo', () => {
    expect(tituloDeMovimiento({ tipo: 'credito', saldoInicial: true, numeroDeCheque: null })).toBe('Saldo inicial');
  });

  it('es "Cheque No. <número>" cuando el tipo es cheque', () => {
    expect(tituloDeMovimiento({ tipo: 'cheque', saldoInicial: false, numeroDeCheque: 7 })).toBe('Cheque No. 7');
  });
});

describe('color y signo del monto', () => {
  it('el crédito entra en verde con "+"', () => {
    expect(SIGNO_DE_TIPO.credito).toBe('+');
    expect(CLASE_DE_TIPO.credito).toContain('campo');
  });

  it('el débito sale en rojo con "−"', () => {
    expect(SIGNO_DE_TIPO.debito).toBe('−');
    expect(CLASE_DE_TIPO.debito).toContain('red');
  });
});

describe('detalles del movimiento', () => {
  it('lleva cuenta, fecha, referencia y beneficiario', () => {
    const detalles = detallesDeMovimiento(base);
    expect(detalles.map((d) => d.etiqueta)).toEqual(['Cuenta', 'Fecha', 'Referencia', 'Beneficiario u origen']);
  });

  it('agrega las observaciones solo si hay', () => {
    const detalles = detallesDeMovimiento({ ...base, observaciones: 'Una nota.' });
    expect(detalles.map((d) => d.etiqueta)).toContain('Observaciones');
  });

  it('agrega el motivo de anulación cuando está anulado', () => {
    const detalles = detallesDeMovimiento({
      ...base,
      anuladoEn: '2026-09-27T10:00:00.000Z',
      motivoDeAnulacion: 'Registrado por error',
    });
    expect(detalles).toContainEqual({ etiqueta: 'Motivo de anulación', valor: 'Registrado por error' });
  });
});
