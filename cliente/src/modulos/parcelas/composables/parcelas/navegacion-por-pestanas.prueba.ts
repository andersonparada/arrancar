import { describe, expect, it } from 'vitest';
import { pestanaTrasLaTecla } from './navegacion-por-pestanas';

const claves = ['datos', 'mediciones', 'inmuebles'] as const;

describe('teclado en las pestañas de la ficha', () => {
  it('las flechas pasan a la vecina y dan la vuelta', () => {
    expect(pestanaTrasLaTecla(claves, 'datos', 'ArrowRight')).toBe('mediciones');
    expect(pestanaTrasLaTecla(claves, 'inmuebles', 'ArrowRight')).toBe('datos');
    expect(pestanaTrasLaTecla(claves, 'datos', 'ArrowLeft')).toBe('inmuebles');
  });

  it('Inicio y Fin van a los extremos', () => {
    expect(pestanaTrasLaTecla(claves, 'mediciones', 'Home')).toBe('datos');
    expect(pestanaTrasLaTecla(claves, 'mediciones', 'End')).toBe('inmuebles');
  });

  it('cualquier otra tecla no hace nada', () => {
    expect(pestanaTrasLaTecla(claves, 'datos', 'Enter')).toBeNull();
    expect(pestanaTrasLaTecla([], 'datos', 'Home')).toBeNull();
  });
});
