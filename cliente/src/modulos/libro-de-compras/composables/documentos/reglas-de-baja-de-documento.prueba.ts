import { describe, expect, it } from 'vitest';
import { nombreDelRegistro } from './reglas-de-baja-de-documento';

describe('nombreDelRegistro', () => {
  it('las notas de crédito y de débito son «nota»; las facturas, «factura»', () => {
    expect(nombreDelRegistro({ tipo: 'nota_de_credito' })).toBe('nota');
    expect(nombreDelRegistro({ tipo: 'nota_de_debito' })).toBe('nota');
    expect(nombreDelRegistro({ tipo: 'factura' })).toBe('factura');
    expect(nombreDelRegistro({ tipo: 'factura_pequeno_contribuyente' })).toBe('factura');
  });
});
