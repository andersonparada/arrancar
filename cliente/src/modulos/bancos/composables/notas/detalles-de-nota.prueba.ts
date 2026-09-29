import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Movimiento } from '../../servicios/movimientos.api';
import { CLASE_DE_TIPO, SIGNO_DE_TIPO, detallesDeNota, tituloDeNota } from './detalles-de-nota';

// `detallesDeNota` da formato con `formatearFecha`, que lee la sesión (Pinia).
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
  numero: null,
  anioDeNumero: 0,
  conciliacionId: null,
  revertidoEn: null,
  motivoDeReversion: null,
  revierteAId: null,
  puedeAnular: true,
  puedeEliminar: true,
};

describe('título de la nota', () => {
  it('es "Nota de crédito" o "Nota de débito" según el tipo', () => {
    expect(tituloDeNota({ tipo: 'credito' })).toBe('Nota de crédito');
    expect(tituloDeNota({ tipo: 'debito' })).toBe('Nota de débito');
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

describe('detalles de la nota', () => {
  it('lleva cuenta, fecha, referencia y beneficiario', () => {
    const detalles = detallesDeNota(base);
    expect(detalles.map((d) => d.etiqueta)).toEqual(['Cuenta', 'Fecha', 'Referencia', 'Beneficiario u origen']);
  });

  it('muestra el número primero, con el año si la empresa reinicia por año', () => {
    expect(detallesDeNota({ ...base, numero: 15, anioDeNumero: 0 })[0]).toEqual({ etiqueta: 'No.', valor: '15' });
    expect(detallesDeNota({ ...base, numero: 15, anioDeNumero: 2026 })[0]).toEqual({
      etiqueta: 'No.',
      valor: '2026-15',
    });
  });

  it('agrega las observaciones solo si hay', () => {
    const detalles = detallesDeNota({ ...base, observaciones: 'Una nota.' });
    expect(detalles.map((d) => d.etiqueta)).toContain('Observaciones');
  });

  it('agrega el motivo de anulación cuando está anulada', () => {
    const detalles = detallesDeNota({
      ...base,
      anuladoEn: '2026-09-27T10:00:00.000Z',
      motivoDeAnulacion: 'Registrada por error',
    });
    expect(detalles).toContainEqual({ etiqueta: 'Motivo de anulación', valor: 'Registrada por error' });
  });

  it('agrega el motivo de la anulación cuando ya se revirtió con su inverso', () => {
    const detalles = detallesDeNota({
      ...base,
      revertidoEn: '2026-09-28T10:00:00.000Z',
      motivoDeReversion: 'Boleta duplicada',
    });
    expect(detalles).toContainEqual({ etiqueta: 'Motivo de anulación', valor: 'Boleta duplicada' });
  });
});
