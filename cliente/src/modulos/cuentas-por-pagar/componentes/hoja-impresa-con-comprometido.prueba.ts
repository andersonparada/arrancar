/**
 * Lo que dejó la QA de CP4-12 (`docs/modulos/informe-qa-cp4-12-2026-11-18.md`): la API de la impresión de la contraseña y
 * del comprobante ya trae `pagado`, `comprometido` y `disponible`, pero las hojas no los muestran, y con un cheque
 * posfechado la fila no cuadra a mano (total − retenciones − rebajado ≠ saldo). La adenda A.5 pide en la hoja las
 * columnas Pagado, Comprometido y Saldo. Las pruebas `it.fails` pasan mientras falte; al corregirlo, quitar `.fails`.
 * Sin librería de montaje, se revisa que la plantilla rotule lo que la API trae.
 */

import { describe, expect, it } from 'vitest';
import tablaDeCargosImpresos from './TablaDeCargosImpresos.vue?raw';
import tablaDelComprobante from './TablaDelComprobante.vue?raw';

describe('la hoja impresa de la contraseña', () => {
  const tabla = tablaDeCargosImpresos;

  it('rotula el total, las retenciones y el saldo', () => {
    expect(tabla).toContain('>Total<');
    expect(tabla).toContain('>Retenciones<');
    expect(tabla).toContain('Saldo {{ textoAlDia');
  });

  it.fails('rotula también lo pagado y lo comprometido con cheques posfechados', () => {
    expect(tabla).toContain('Pagado');
    expect(tabla).toContain('Comprometido');
  });
});

describe('la hoja del comprobante de pago', () => {
  const tabla = tablaDelComprobante;

  it.fails('dice cuánto de lo que queda está comprometido con cheques posfechados', () => {
    expect(tabla).toMatch(/comprometido/i);
  });
});
