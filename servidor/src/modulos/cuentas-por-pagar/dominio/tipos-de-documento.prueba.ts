import { describe, expect, it } from 'vitest';
import { TIPOS_DE_DOCUMENTO, TIPOS_DE_FACTURA } from './tipos-de-documento.js';

describe('familia de factura', () => {
  it('los tipos de factura más la nota de crédito, la de débito y el recibo son todos los tipos', () => {
    const otros = ['nota_de_credito', 'nota_de_debito', 'recibo'];

    expect([...TIPOS_DE_FACTURA, ...otros].sort()).toEqual([...TIPOS_DE_DOCUMENTO].sort());
  });
});
