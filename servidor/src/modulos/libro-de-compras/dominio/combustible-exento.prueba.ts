import { describe, expect, it } from 'vitest';
import { AVISO_COMBUSTIBLE_EXENTO, exentoDeCombustibleExento } from './combustible-exento.js';

const linea = { total: 50000, idp: 0, otrosImpuestos: 0, exentoEscrito: 0 };

describe('exento de un combustible exento de IVA', () => {
  it('sin exento escrito propone el total menos el IDP y los otros impuestos', () => {
    expect(exentoDeCombustibleExento(linea)).toEqual({ exento: 50000, aviso: null });
    expect(exentoDeCombustibleExento({ ...linea, idp: 4700, otrosImpuestos: 300 })).toEqual({
      exento: 45000,
      aviso: null,
    });
  });

  it('un exento escrito igual al propuesto no avisa', () => {
    expect(exentoDeCombustibleExento({ ...linea, exentoEscrito: 50000 })).toEqual({ exento: 50000, aviso: null });
  });

  it('otro exento escrito se respeta y avisa', () => {
    expect(exentoDeCombustibleExento({ ...linea, exentoEscrito: 10000 })).toEqual({
      exento: 10000,
      aviso: AVISO_COMBUSTIBLE_EXENTO,
    });
  });

  it('si el IDP y los otros impuestos pasan del total, propone cero y deja el error al cálculo', () => {
    expect(exentoDeCombustibleExento({ ...linea, idp: 60000 }).exento).toBe(0);
  });
});
