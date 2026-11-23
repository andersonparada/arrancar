import { describe, expect, it } from 'vitest';
import { opcionesDeLocalidades, opcionesDeResponsables } from './opciones-de-bodega';

const localidad = (id: string, nombre: string, activo = true) => ({ id, codigo: id, nombre, activo });

describe('opciones de la bodega', () => {
  it('las localidades van por nombre y sin las inactivas', () => {
    const opciones = opcionesDeLocalidades(
      [localidad('b', 'Zeta'), localidad('a', 'Alfa'), localidad('c', 'Vieja', false)],
      null,
    );
    expect(opciones.map((o) => o.texto)).toEqual(['Sin elegir', 'Alfa', 'Zeta']);
  });

  it('conserva la localidad inactiva que la bodega ya tiene y lo dice', () => {
    const opciones = opcionesDeLocalidades([localidad('c', 'Vieja', false)], 'c');
    expect(opciones[1]).toEqual({ valor: 'c', texto: 'Vieja (inactiva)' });
  });

  it('los responsables van por nombre completo con su usuario', () => {
    const base = { roles: [], veTodas: false };
    const opciones = opcionesDeResponsables([
      { usuarioId: '2', usuario: 'zoila', nombres: 'Zoila', apellidos: 'Pérez', ...base },
      { usuarioId: '1', usuario: 'ana', nombres: 'Ana', apellidos: 'López', ...base },
    ]);
    expect(opciones.map((o) => o.texto)).toEqual(['Sin elegir', 'Ana López (ana)', 'Zoila Pérez (zoila)']);
  });
});
