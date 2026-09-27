import { describe, expect, it } from 'vitest';
import { Nit, NitInvalido, esNitValido, normalizarNit } from './nit.js';

describe('NIT de Guatemala', () => {
  it('normaliza guiones, espacios y minúsculas', () => {
    expect(normalizarNit(' 576937-k ')).toBe('576937K');
  });

  it.each(['576937K', '12345679', '123456789', 'CF'])('acepta NIT con verificador correcto: %s', (nit) => {
    expect(esNitValido(nit)).toBe(true);
  });

  it.each(['576937-K', '12345678', '5769370', 'ABC', ''])('rechaza NIT inválido: %s', (nit) => {
    expect(esNitValido(nit)).toBe(false);
  });
});

describe('objeto de valor Nit', () => {
  it('se crea normalizado a partir de lo que escribe el usuario', () => {
    expect(Nit.crear(' 576937-k ').valor).toBe('576937K');
  });

  it('no se puede crear con un verificador incorrecto', () => {
    expect(() => Nit.crear('12345678')).toThrow(NitInvalido);
  });

  it('reconoce al consumidor final escrito de cualquier forma', () => {
    const nit = Nit.crear('cf');

    expect(nit.esConsumidorFinal()).toBe(true);
    expect(nit.esIgualA(Nit.CONSUMIDOR_FINAL)).toBe(true);
  });

  it('dos NIT con el mismo número son iguales', () => {
    expect(Nit.crear('12345679').esIgualA(Nit.crear('1234567-9'))).toBe(true);
  });
});
