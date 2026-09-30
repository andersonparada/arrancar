import { describe, expect, it } from 'vitest';
import { avisoDeCambioDeEstado, mensajeDeCambioDeEstado, ordenarPorNombre } from './cambio-de-estado';

const catalogo = { conArticulo: 'el combustible', capitalizado: 'Combustible' };

describe('inactivar y reactivar un catálogo', () => {
  it('al inactivar explica que lo registrado se conserva', () => {
    const mensaje = mensajeDeCambioDeEstado(catalogo, { nombre: 'Diésel', activo: true });
    expect(mensaje).toContain('¿Inactivar el combustible «Diésel»?');
    expect(mensaje).toContain('se conserva');
  });

  it('al reactivar dice que vuelve a ofrecerse', () => {
    expect(mensajeDeCambioDeEstado(catalogo, { nombre: 'Diésel', activo: false })).toContain('¿Reactivar');
  });

  it('el aviso dice lo que quedó hecho', () => {
    expect(avisoDeCambioDeEstado(catalogo, false)).toBe('Combustible inactivado.');
    expect(avisoDeCambioDeEstado(catalogo, true)).toBe('Combustible reactivado.');
  });

  it('ordena por nombre sin distinguir acentos ni mayúsculas', () => {
    const ordenados = ordenarPorNombre([{ nombre: 'Óleo' }, { nombre: 'abono' }, { nombre: 'Zinc' }]);
    expect(ordenados.map((r) => r.nombre)).toEqual(['abono', 'Óleo', 'Zinc']);
  });
});
