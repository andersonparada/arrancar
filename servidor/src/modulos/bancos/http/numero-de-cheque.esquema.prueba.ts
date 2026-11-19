import { describe, expect, it } from 'vitest';
import { numeroDeChequeOpcional } from './numero-de-cheque.esquema.js';

describe('numeroDeChequeOpcional', () => {
  const esquema = numeroDeChequeOpcional();

  it.each([1, 5001, 2147483647])('acepta %d', (numero) => {
    expect(esquema.safeParse(numero).data).toBe(numero);
  });

  it.each([undefined, null])('acepta la falta (%s) como nulo', (valor) => {
    expect(esquema.safeParse(valor).data).toBeNull();
  });

  it.each([0, -3, 2147483648, 99999999999, 1.5])('rechaza %d', (numero) => {
    expect(esquema.safeParse(numero).success).toBe(false);
  });
});
