import { describe, expect, it } from 'vitest';
import {
  descripcionDelArchivo,
  estaDesactualizada,
  formatearTamano,
  huellaCorta,
  problemaDelArchivo,
} from './estado-de-cuenta';

const MB = 1024 * 1024;
const archivo = (type: string, size = 1000, name = 'a') => ({ type, size, name });

describe('formatearTamano', () => {
  it('elige la unidad', () => {
    expect(formatearTamano(500)).toBe('500 B');
    expect(formatearTamano(850 * 1024)).toBe('850 KB');
    expect(formatearTamano(2.4 * MB)).toBe('2.4 MB');
  });
});

describe('problemaDelArchivo', () => {
  it('acepta PDF y fotos normales', () => {
    expect(problemaDelArchivo(archivo('application/pdf'))).toBeNull();
    expect(problemaDelArchivo(archivo('image/jpeg'))).toBeNull();
  });
  it('rechaza HEIC con cómo corregirlo, aunque el tipo llegue vacío', () => {
    expect(problemaDelArchivo(archivo('image/heic'))).toContain('JPEG');
    expect(problemaDelArchivo(archivo('', 10, 'foto.HEIC'))).toContain('HEIC');
  });
  it('rechaza otros tipos y archivos vacíos', () => {
    expect(problemaDelArchivo(archivo('text/plain'))).toContain('PDF');
    expect(problemaDelArchivo(archivo('application/pdf', 0))).toContain('vacío');
  });
  it('el tope del PDF es 10 MB y el de la foto 15 MB', () => {
    expect(problemaDelArchivo(archivo('application/pdf', 11 * MB))).toContain('10.0 MB');
    expect(problemaDelArchivo(archivo('image/png', 11 * MB))).toBeNull();
    expect(problemaDelArchivo(archivo('image/png', 16 * MB))).toContain('15.0 MB');
  });
});

describe('descripcionDelArchivo', () => {
  const base = { sha256: 'x', nombreOriginal: null, subidoEn: '', subidoPorNombre: null };
  it('PDF con páginas', () => {
    expect(descripcionDelArchivo({ ...base, tipoMime: 'application/pdf', tamanoBytes: 2048, paginas: 3 })).toBe(
      'PDF · 3 pág. · 2 KB',
    );
  });
  it('foto sin páginas', () => {
    expect(descripcionDelArchivo({ ...base, tipoMime: 'image/webp', tamanoBytes: 100, paginas: null })).toBe(
      'Foto · 100 B',
    );
  });
});

describe('otros', () => {
  it('huella corta', () => expect(huellaCorta('abcdef0123456789')).toBe('abcdef012345'));
  it('desactualizada solo si ya no está en proceso', () => {
    expect(estaDesactualizada('conciliacion_no_esta_en_proceso')).toBe(true);
    expect(estaDesactualizada('pdf_danado')).toBe(false);
  });
});
