import { describe, expect, it } from 'vitest';
import { formatearNumeroDeComprobante } from './numero-de-comprobante';

describe('formatearNumeroDeComprobante', () => {
  it('sin número no hay nada que mostrar', () => {
    expect(formatearNumeroDeComprobante({ numero: null, anioDeNumero: 0 })).toBeNull();
  });

  it('si la empresa no reinicia por año, es solo el número', () => {
    expect(formatearNumeroDeComprobante({ numero: 15, anioDeNumero: 0 })).toBe('15');
  });

  it('si reinicia por año, lleva el año antes del número', () => {
    expect(formatearNumeroDeComprobante({ numero: 15, anioDeNumero: 2026 })).toBe('2026-15');
  });
});
