import { describe, expect, it } from 'vitest';
import { creoSuMovimiento, esDeLaApertura } from './pago-con-lineas.js';
import type { FormaDePago } from './pagos.js';

describe('qué formas de pago tienen un movimiento de Bancos propio', () => {
  it('cheque, nota de débito y cheque de apertura se anulan con una orden a Bancos', () => {
    const creadoras: FormaDePago[] = ['cheque', 'nota_de_debito', 'cheque_de_apertura'];
    for (const forma of creadoras) expect(creoSuMovimiento({ forma })).toBe(true);
  });

  it('la nota ligada es de varios pagos, y la cuenta de apertura y el efectivo no mueven nada en Bancos', () => {
    const otras: FormaDePago[] = ['nota_ligada', 'cuenta_de_apertura', 'efectivo'];
    for (const forma of otras) expect(creoSuMovimiento({ forma })).toBe(false);
  });
});

describe('las formas que solo cubren lo que ya se debía al corte', () => {
  it('son la cuenta de apertura y el cheque de apertura', () => {
    expect(esDeLaApertura({ forma: 'cuenta_de_apertura' })).toBe(true);
    expect(esDeLaApertura({ forma: 'cheque_de_apertura' })).toBe(true);
    expect(esDeLaApertura({ forma: 'cheque' })).toBe(false);
  });
});
