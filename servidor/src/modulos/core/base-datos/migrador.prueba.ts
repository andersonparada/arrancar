import { describe, expect, it } from 'vitest';
import type { DefinicionModulo } from '../modulos-sistema/definicion-modulo.js';
import { nombreEsquemaDe, ordenarPorDependencias } from './migrador.js';

const modulo = (clave: string, dependeDe: string[] = []): DefinicionModulo => ({
  clave,
  nombre: clave,
  descripcion: '',
  permisos: [],
  dependeDe,
});

describe('ordenarPorDependencias', () => {
  it('migra el núcleo primero y cada módulo después de sus dependencias', () => {
    const orden = ordenarPorDependencias([
      modulo('caja-chica', ['bancos']),
      modulo('bancos', ['moneda-extranjera']),
      modulo('moneda-extranjera'),
      modulo('core'),
    ]).map((m) => m.clave);

    expect(orden[0]).toBe('core');
    expect(orden.indexOf('moneda-extranjera')).toBeLessThan(orden.indexOf('bancos'));
    expect(orden.indexOf('bancos')).toBeLessThan(orden.indexOf('caja-chica'));
  });

  it('detecta dependencias circulares', () => {
    expect(() => ordenarPorDependencias([modulo('core'), modulo('a', ['b']), modulo('b', ['a'])])).toThrow(/circular/);
  });
});

describe('nombreEsquemaDe', () => {
  it('convierte la clave del módulo en un nombre de esquema válido', () => {
    expect(nombreEsquemaDe('moneda-extranjera')).toBe('moneda_extranjera');
  });
});
