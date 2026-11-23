import { describe, expect, it } from 'vitest';
import { CodigoFueraDeLaMascara, MascaraInvalida } from './errores.js';
import { MascaraDeCuentas } from './mascara-de-cuentas.js';

const mascara = () => MascaraDeCuentas.desde('9.9.99.99.999');

describe('MascaraDeCuentas', () => {
  it.each(['9.9.99.99', '9.9.99.99.999', '9.9.9.9.9.9'])('acepta %s', (texto) => {
    expect(MascaraDeCuentas.desde(texto).texto).toBe(texto);
  });

  it.each(['', '9.9.9', '9.9.9.9.9.9.9', '9.9.A.9', '99', '9..9.9.9', '1.1.01.01'])('rechaza «%s»', (texto) => {
    expect(() => MascaraDeCuentas.desde(texto)).toThrow(MascaraInvalida);
  });

  it('cuenta sus niveles', () => {
    expect(mascara().niveles).toBe(5);
  });

  it('da el nivel de un código completo y el de uno corto', () => {
    expect(mascara().nivelDe('1.1.01.01.001')).toBe(5);
    expect(mascara().nivelDe('1')).toBe(1);
    expect(mascara().nivelDe('1.2.03')).toBe(3);
  });

  it.each(['1.1.1', '1.1.01.01.001.1', 'A', '1.1.0A', '', '1.1.01.01.01'])(
    'rechaza el código «%s» fuera de la máscara',
    (codigo) => {
      expect(() => mascara().nivelDe(codigo)).toThrow(CodigoFueraDeLaMascara);
    },
  );

  it('da el código de la cuenta superior, nulo en el primer nivel', () => {
    expect(mascara().codigoDelPadre('1.1.01')).toBe('1.1');
    expect(mascara().codigoDelPadre('1')).toBeNull();
  });
});
