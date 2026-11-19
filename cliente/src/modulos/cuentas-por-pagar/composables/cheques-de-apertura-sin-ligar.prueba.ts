import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { avisoDeChequesDeAperturaSinLigar } from './cheques-de-apertura-sin-ligar';

beforeEach(() => setActivePinia(createPinia()));

describe('aviso de cheques de apertura sin ligar', () => {
  it('sin cheques, o sin dato, no hay aviso', () => {
    expect(avisoDeChequesDeAperturaSinLigar({ cantidad: 0, total: '0.00' })).toBeNull();
    expect(avisoDeChequesDeAperturaSinLigar(null)).toBeNull();
    expect(avisoDeChequesDeAperturaSinLigar(undefined)).toBeNull();
  });

  it('con uno habla en singular y con varios dice cuántos y cuánto suman', () => {
    expect(avisoDeChequesDeAperturaSinLigar({ cantidad: 1, total: '75.00' })).toBe(
      'Hay 1 cheque posfechado de apertura sin ligar (Q\u00a075.00): no pague estas facturas otra vez; se podrán ligar pronto.',
    );
    expect(avisoDeChequesDeAperturaSinLigar({ cantidad: 3, total: '1200.50' })).toContain(
      'Hay 3 cheques posfechados de apertura sin ligar (Q\u00a01,200.50)',
    );
  });
});
