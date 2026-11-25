import { describe, expect, it } from 'vitest';
import {
  avisoDeCambioDeEstado,
  mensajeDeCambioDeEstado,
  mensajeDeEliminacion,
  ordenarPorNombre,
} from './cambio-de-estado';

const catalogo = { conArticulo: 'el concepto de ingreso', capitalizado: 'Concepto de ingreso' };

describe('inactivar, reactivar y eliminar un catálogo', () => {
  it('al inactivar explica que lo registrado se conserva', () => {
    const mensaje = mensajeDeCambioDeEstado(catalogo, { nombre: 'Venta de queso', activo: true });
    expect(mensaje).toContain('¿Inactivar el concepto de ingreso «Venta de queso»?');
    expect(mensaje).toContain('se conserva');
  });

  it('al reactivar dice que vuelve a ofrecerse', () => {
    expect(mensajeDeCambioDeEstado(catalogo, { nombre: 'Venta de queso', activo: false })).toContain('¿Reactivar');
  });

  it('el aviso dice lo que quedó hecho', () => {
    expect(avisoDeCambioDeEstado(catalogo, false)).toBe('Concepto de ingreso inactivado.');
    expect(avisoDeCambioDeEstado(catalogo, true)).toBe('Concepto de ingreso reactivado.');
  });

  it('al eliminar avisa que no se deshace y propone inactivar', () => {
    const mensaje = mensajeDeEliminacion(catalogo, 'Otros');
    expect(mensaje).toContain('no se puede deshacer');
    expect(mensaje).toContain('inactívelo');
  });

  it('ordena por nombre sin distinguir acentos ni mayúsculas', () => {
    const ordenados = ordenarPorNombre([{ nombre: 'Óleo' }, { nombre: 'abono' }, { nombre: 'Zinc' }]);
    expect(ordenados.map((registro) => registro.nombre)).toEqual(['abono', 'Óleo', 'Zinc']);
  });
});
