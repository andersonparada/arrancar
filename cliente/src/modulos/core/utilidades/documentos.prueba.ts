import { describe, expect, it } from 'vitest';
import {
  descripcionDelDocumento,
  documentoEsPdf,
  formatearTamano,
  huellaCorta,
  problemaDelDocumento,
  SOLO_PDF,
} from './documentos';

const MB = 1024 * 1024;
const archivo = (type: string, size = 1000, name = 'a') => ({ type, size, name });

describe('formatearTamano', () => {
  it('elige la unidad', () => {
    expect(formatearTamano(500)).toBe('500 B');
    expect(formatearTamano(850 * 1024)).toBe('850 KB');
    expect(formatearTamano(2.4 * MB)).toBe('2.4 MB');
  });
});

describe('problemaDelDocumento', () => {
  it('acepta un PDF de tamaño razonable', () => {
    expect(problemaDelDocumento(archivo('application/pdf'), SOLO_PDF)).toBeNull();
  });

  it('rechaza lo que no es PDF y dice cómo corregirlo', () => {
    expect(problemaDelDocumento(archivo('image/jpeg'), SOLO_PDF)).toContain('escanéelo como PDF');
  });

  it('rechaza el archivo vacío y el que pasa el tope', () => {
    expect(problemaDelDocumento(archivo('application/pdf', 0), SOLO_PDF)).toContain('vacío');
    expect(problemaDelDocumento(archivo('application/pdf', 11 * MB), SOLO_PDF)).toBe(
      'El archivo pesa 11.0 MB y el máximo es 10.0 MB: reduzca su tamaño.',
    );
  });

  it('usa el tope propio de cada tipo', () => {
    const reglas = { ...SOLO_PDF, tipos: ['image/png'], topes: { 'image/png': 1000 } };
    expect(problemaDelDocumento(archivo('image/png', 2000), reglas)).toContain('máximo es 1000 B');
  });
});

describe('descripción del documento', () => {
  const documento = {
    nombreOriginal: 'balance.pdf',
    tamanoBytes: 1.2 * MB,
    paginas: 3,
    sha256: 'abcdef0123456789',
    subidoEn: '2026-11-18T10:00:00Z',
    subidoPorNombre: 'Ana',
  };

  it('dice tipo, páginas y tamaño', () => {
    expect(descripcionDelDocumento(documento)).toBe('PDF · 3 pág. · 1.2 MB');
    expect(descripcionDelDocumento({ ...documento, paginas: null, tipoMime: 'image/png' })).toBe('Foto · 1.2 MB');
  });

  it('sin tipo se asume PDF', () => {
    expect(documentoEsPdf(documento)).toBe(true);
    expect(documentoEsPdf({ tipoMime: 'image/webp' })).toBe(false);
  });

  it('acorta la huella', () => {
    expect(huellaCorta(documento.sha256)).toBe('abcdef012345');
  });
});
