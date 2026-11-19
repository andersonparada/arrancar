import { describe, expect, it } from 'vitest';
import { avisoDeSubida, problemaDeLaEvidencia, textoSinEvidencia } from './evidencia-de-apertura';

const archivo = (cambios: Partial<{ type: string; size: number; name: string }> = {}) => ({
  type: 'application/pdf',
  size: 1000,
  name: 'estado.pdf',
  ...cambios,
});

describe('la evidencia de la apertura', () => {
  it('acepta un PDF y una foto, y rechaza lo demás con la forma de corregirlo', () => {
    expect(problemaDeLaEvidencia(archivo())).toBeNull();
    expect(problemaDeLaEvidencia(archivo({ type: 'image/png', name: 'foto.png' }))).toBeNull();
    expect(problemaDeLaEvidencia(archivo({ type: 'text/plain', name: 'a.txt' }))).toMatch(/Solo se aceptan/);
    expect(problemaDeLaEvidencia(archivo({ size: 0 }))).toMatch(/vacío/);
    expect(problemaDeLaEvidencia(archivo({ size: 11 * 1024 * 1024 }))).toMatch(/máximo/);
    expect(problemaDeLaEvidencia(archivo({ type: 'image/heic', name: 'f.heic' }))).toMatch(/HEIC/);
  });

  it('el aviso distingue adjuntar de reemplazar', () => {
    expect(avisoDeSubida(false)).toBe('Evidencia adjuntada.');
    expect(avisoDeSubida(true)).toBe('Evidencia reemplazada.');
  });

  it('sin archivo, quien puede editar sabe que es opcional y quien no, solo lo ve', () => {
    expect(textoSinEvidencia(true)).toContain('opcional');
    expect(textoSinEvidencia(false)).toBe('No se adjuntó evidencia.');
  });
});
