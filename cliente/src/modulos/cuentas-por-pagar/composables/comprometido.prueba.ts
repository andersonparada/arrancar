import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { SaldoDelProveedor } from '../servicios/tipos';
import { detallesDeCondiciones } from './condiciones-de-pago';
import {
  detallesDeLoQueSeDebe,
  diaYMes,
  etiquetaDeComprometido,
  hayMontoPositivo,
  textoDeMontoMayorAlDisponible,
} from './comprometido';

beforeEach(() => setActivePinia(createPinia()));

const proveedor = (cambios: Partial<SaldoDelProveedor> = {}): SaldoDelProveedor => ({
  proveedorId: 'p1',
  proveedorNombre: 'Agro S.A.',
  porPagar: '1000.00',
  vencido: '400.00',
  comprometido: '0.00',
  disponible: '1000.00',
  vencidoComprometido: '0.00',
  posfechados: [],
  cargosConSaldo: 2,
  saldosDeudores: '0.00',
  notasConSaldoLibre: [],
  ...cambios,
});

const conCheque = proveedor({
  comprometido: '300.00',
  disponible: '700.00',
  vencidoComprometido: '100.00',
  posfechados: [{ numeroDeCheque: '1523', fecha: '2026-12-20', monto: '300.00' }],
});

describe('fechas y montos', () => {
  it('dd/mm de una fecha del servidor', () => {
    expect(diaYMes('2026-12-05')).toBe('05/12');
    expect(diaYMes('mal')).toBe('');
  });

  it('un monto ilegible o en cero no cuenta', () => {
    expect(hayMontoPositivo('0.00')).toBe(false);
    expect(hayMontoPositivo(undefined)).toBe(false);
    expect(hayMontoPositivo('0.01')).toBe(true);
  });
});

describe('etiqueta del comprometido de un documento', () => {
  it('dice la fecha del cheque', () => {
    expect(etiquetaDeComprometido('2026-12-20')).toBe('Comprometido — cheque al 20/12/2026');
  });

  it('con varios cheques dice cuántos y la fecha del último', () => {
    expect(etiquetaDeComprometido('2026-12-20', 2)).toBe('Comprometido — 2 cheques, el último al 20/12/2026');
  });

  it('sin fecha es solo «Comprometido»', () => {
    expect(etiquetaDeComprometido(null)).toBe('Comprometido');
  });
});

describe('lo que se debe a un proveedor', () => {
  it('sin cheques posfechados solo dice lo por pagar y lo vencido', () => {
    expect(detallesDeLoQueSeDebe(proveedor()).map(({ etiqueta }) => etiqueta)).toEqual(['Por pagar', 'Vencido']);
  });

  it('con un cheque dice por pagar, de lo cual comprometido con el cheque y disponible', () => {
    const detalles = detallesDeLoQueSeDebe(conCheque);
    expect(detalles.map(({ etiqueta }) => etiqueta)).toEqual([
      'Por pagar',
      'De lo cual comprometido',
      'Disponible para pagar',
      'Vencido',
    ]);
    expect(detalles[1]?.valor).toBe('cheque 1523 al 20/12 Q\u00a0300.00');
    expect(detalles[2]?.valor).toBe('Q\u00a0700.00');
  });

  it('lo vencido explica lo que ya tiene cheque', () => {
    expect(detallesDeLoQueSeDebe(conCheque)[3]?.valor).toMatch(
      /incluye Q\u00a0100\.00 ya cubierto con cheque posfechado/,
    );
    expect(detallesDeLoQueSeDebe(proveedor())[1]?.valor).toBe('Q\u00a0400.00');
  });

  it('un cheque sin número se llama «cheque posfechado»', () => {
    const detalles = detallesDeLoQueSeDebe({
      ...conCheque,
      posfechados: [{ numeroDeCheque: null, fecha: '2026-12-20', monto: '300.00' }],
    });
    expect(detalles[1]?.valor).toBe('cheque posfechado al 20/12 Q\u00a0300.00');
  });

  it('si el servidor mandó solo algunos cheques, lo dice', () => {
    const detalles = detallesDeLoQueSeDebe({ ...conCheque, comprometido: '900.00' });
    expect(detalles[1]?.valor).toMatch(/; y otros más$/);
  });

  it('la ficha del proveedor lo usa tras el plazo', () => {
    const detalles = detallesDeCondiciones({ diasDeCredito: null, contarDesdeLaRecepcion: false }, conCheque);
    expect(detalles.map(({ etiqueta }) => etiqueta)).toContain('Disponible para pagar');
  });
});

describe('monto mayor al disponible', () => {
  it('dice cuánto se puede pagar y, si hay cheque, que lo demás está comprometido', () => {
    expect(textoDeMontoMayorAlDisponible({ disponible: '700.00', comprometido: '0.00' })).toBe(
      'Este documento solo tiene Q\u00a0700.00 disponible para pagar: escriba ese monto o menos.',
    );
    expect(textoDeMontoMayorAlDisponible({ disponible: '700.00', comprometido: '300.00' })).toMatch(
      /Q\u00a0300\.00 ya está comprometido con un cheque posfechado/,
    );
  });
});
