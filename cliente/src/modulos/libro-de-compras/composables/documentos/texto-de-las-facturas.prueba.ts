import { describe, expect, it } from 'vitest';
import { textoInicialDeLasFacturas } from './texto-de-las-facturas';

describe('textoInicialDeLasFacturas', () => {
  it('sin proveedor no dice que no tiene facturas', () => {
    const texto = textoInicialDeLasFacturas({ hayProveedor: false, sinOpciones: true, esDebito: false });
    expect(texto).toBe('Primero elija el proveedor');
  });

  it('con proveedor sin facturas lo dice, y con facturas invita a elegir', () => {
    expect(textoInicialDeLasFacturas({ hayProveedor: true, sinOpciones: true, esDebito: false })).toBe(
      'Este proveedor no tiene facturas vigentes',
    );
    expect(textoInicialDeLasFacturas({ hayProveedor: true, sinOpciones: true, esDebito: true })).toContain(
      'en el libro',
    );
    expect(textoInicialDeLasFacturas({ hayProveedor: true, sinOpciones: false, esDebito: false })).toBe(
      'Elija la factura',
    );
  });
});
