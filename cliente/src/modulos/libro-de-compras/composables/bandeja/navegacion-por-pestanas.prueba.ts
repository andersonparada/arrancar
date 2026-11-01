import { describe, expect, it } from 'vitest';
import { pestanaTrasLaTecla } from './navegacion-por-pestanas';

const claves = ['a', 'b', 'c'] as const;

describe('navegación por pestañas con el teclado', () => {
  it('las flechas avanzan y retroceden', () => {
    expect(pestanaTrasLaTecla(claves, 'a', 'ArrowRight')).toBe('b');
    expect(pestanaTrasLaTecla(claves, 'c', 'ArrowLeft')).toBe('b');
  });

  it('dan la vuelta en los extremos', () => {
    expect(pestanaTrasLaTecla(claves, 'c', 'ArrowRight')).toBe('a');
    expect(pestanaTrasLaTecla(claves, 'a', 'ArrowLeft')).toBe('c');
  });

  it('Inicio y Fin saltan a los extremos', () => {
    expect(pestanaTrasLaTecla(claves, 'b', 'Home')).toBe('a');
    expect(pestanaTrasLaTecla(claves, 'b', 'End')).toBe('c');
  });

  it('otras teclas, una pestaña desconocida o una lista vacía no mueven nada', () => {
    expect(pestanaTrasLaTecla(claves, 'a', 'Enter')).toBeNull();
    expect(pestanaTrasLaTecla(claves, 'x' as 'a', 'ArrowRight')).toBeNull();
    expect(pestanaTrasLaTecla([], 'a', 'ArrowRight')).toBeNull();
  });
});
