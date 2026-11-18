import { describe, expect, it } from 'vitest';
import { sanearNombreDeAdjunto, sanearParaCuerpo, sanearTexto } from './saneado.js';

describe('sanearTexto', () => {
  it('quita saltos de línea, controles y bidireccionales, y junta espacios', () => {
    expect(sanearTexto('Pago\r\nBcc: x@y.com\u0000  \u202Efinal', 150)).toBe('Pago Bcc: x@y.com final');
  });

  it('corta al máximo', () => {
    expect(sanearTexto('a'.repeat(300), 150)).toHaveLength(150);
  });
});

describe('sanearParaCuerpo', () => {
  it('conserva los saltos de línea, normaliza CRLF y quita los demás controles', () => {
    expect(sanearParaCuerpo('uno\r\ndos\u0000\u202E\ttres')).toBe('uno\ndos\ttres');
  });
});

describe('sanearNombreDeAdjunto', () => {
  it('fuerza .pdf y quita separadores de ruta y controles', () => {
    const nombre = sanearNombreDeAdjunto('../../etc/passwd\r\n');
    expect(nombre).toBe('.. etc passwd.pdf');
    expect(nombre).not.toMatch(/[\\/\r\n]/);
  });

  it('no duplica la extensión', () => {
    expect(sanearNombreDeAdjunto('comprobante-de-pago-12.pdf')).toBe('comprobante-de-pago-12.pdf');
  });

  it('corta a 80 caracteres más la extensión y no deja el nombre vacío', () => {
    expect(sanearNombreDeAdjunto('x'.repeat(200))).toHaveLength(84);
    expect(sanearNombreDeAdjunto('\r\n')).toBe('documento.pdf');
  });
});
