import { describe, expect, it } from 'vitest';
import { esDpiValido, normalizarDpi } from './dpi.js';

describe('DPI (CUI) de Guatemala', () => {
  it('quita espacios y guiones', () => {
    expect(normalizarDpi('1234 56789 0101')).toBe('1234567890101');
  });

  it.each([
    '1234567890101', // Guatemala (01), municipio 01
    '0000000002217', // Jutiapa (22), municipio 17 (el último válido)
  ])('acepta un CUI con verificador y ubicación correctos: %s', (dpi) => {
    expect(esDpiValido(dpi)).toBe(true);
  });

  it('rechaza un CUI con el dígito verificador incorrecto', () => {
    expect(esDpiValido('1234567800101')).toBe(false);
  });

  it('rechaza un departamento que no existe', () => {
    expect(esDpiValido('1234567892301')).toBe(false);
  });

  it('rechaza un municipio fuera del rango de su departamento', () => {
    expect(esDpiValido('1234567890118')).toBe(false);
  });

  it.each(['123456789', '', 'ABCDEFGHIJKLM', '12345678901012'])('rechaza un CUI con formato inválido: %s', (dpi) => {
    expect(esDpiValido(dpi)).toBe(false);
  });
});
