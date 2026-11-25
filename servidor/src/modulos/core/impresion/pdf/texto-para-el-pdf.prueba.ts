import { describe, expect, it } from 'vitest';
import { LARGO_MAXIMO_DEL_NOMBRE, textoParaElPdf } from './texto-para-el-pdf.js';

describe('textoParaElPdf', () => {
  it('deja intacto un texto normal con acentos y eñes', () => {
    expect(textoParaElPdf('Distribuidora Peña, S. A.', 60)).toBe('Distribuidora Peña, S. A.');
  });

  it('normaliza a NFC', () => {
    expect(textoParaElPdf(['Pen', String.fromCodePoint(0x303), 'a'].join(''), 60)).toBe('Peña');
  });

  it('quita los controles y la inversión de dirección', () => {
    const sucio = [
      'abc',
      String.fromCodePoint(0),
      'def',
      String.fromCodePoint(0x202e),
      'ghi',
      String.fromCodePoint(0x200b),
      'jk',
      String.fromCodePoint(0x2066),
      'l',
      String.fromCodePoint(0x85),
      'm',
    ].join('');
    expect(textoParaElPdf(sucio, 60)).toBe('abcdefghijklm');
  });

  it('los saltos de línea y tabuladores se vuelven un espacio', () => {
    expect(textoParaElPdf('uno\ndos\t\ttres', 60)).toBe('uno dos tres');
  });

  it('recorta con puntos suspensivos al máximo', () => {
    const recortado = textoParaElPdf('a'.repeat(100), LARGO_MAXIMO_DEL_NOMBRE);

    expect(Array.from(recortado)).toHaveLength(LARGO_MAXIMO_DEL_NOMBRE);
    expect(recortado.endsWith('…')).toBe(true);
  });

  it('no parte un carácter fuera del plano básico', () => {
    const recortado = textoParaElPdf('😀'.repeat(100), 10);

    expect(Array.from(recortado)).toHaveLength(10);
    expect(recortado).not.toContain('�');
  });

  it('un texto de 10 millones de caracteres sin espacios se recorta al instante', () => {
    const inicio = performance.now();
    const recortado = textoParaElPdf('x'.repeat(10_000_000), 60);

    expect(recortado).toHaveLength(60);
    expect(performance.now() - inicio).toBeLessThan(200);
  });
});
