import { describe, expect, it } from 'vitest';
import { datosParaCambiarEstado } from './reglas-de-combustible';

describe('inactivar y reactivar un combustible', () => {
  it('manda el mismo nombre con activo invertido', () => {
    const diesel = { id: 'c-1', nombre: 'Diésel', activo: true };
    expect(datosParaCambiarEstado(diesel)).toEqual({ nombre: 'Diésel', activo: false });
    expect(datosParaCambiarEstado({ ...diesel, activo: false })).toEqual({ nombre: 'Diésel', activo: true });
  });
});
