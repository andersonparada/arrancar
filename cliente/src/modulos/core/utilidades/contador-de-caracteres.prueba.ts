import { describe, expect, it } from 'vitest';
import { contadorDeCaracteres } from './contador-de-caracteres';

describe('contadorDeCaracteres', () => {
  it('cuenta lo escrito y no marca error dentro del tope', () => {
    const estado = contadorDeCaracteres('abc', 100);
    expect(estado).toMatchObject({ usados: 3, excedido: false, error: null, texto: '3 de 100 caracteres' });
  });

  it('exactamente en el tope todavía es válido', () => {
    expect(contadorDeCaracteres('a'.repeat(100), 100).excedido).toBe(false);
  });

  it('dice cuántos sobran, en singular y plural', () => {
    expect(contadorDeCaracteres('a'.repeat(101), 100).error).toBe('Sobra 1 carácter. Acórtelo a 100 o menos.');
    expect(contadorDeCaracteres('a'.repeat(105), 100).error).toBe('Sobran 5 caracteres. Acórtelo a 100 o menos.');
  });

  it('ignora los espacios de los bordes y acepta vacío o nulo', () => {
    expect(contadorDeCaracteres('  ab  ', 5).usados).toBe(2);
    expect(contadorDeCaracteres(null, 5).usados).toBe(0);
    expect(contadorDeCaracteres(undefined, 5).excedido).toBe(false);
  });
});
