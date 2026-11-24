import { describe, expect, it } from 'vitest';
import { filtrosSinVacios, opcionesDeFiltro } from './opciones-de-filtro';

describe('filtros', () => {
  it('«Todas» va primero y el resto por nombre, marcando las inactivas', () => {
    const opciones = opcionesDeFiltro(
      [
        { id: '2', nombre: 'Zeta' },
        { id: '1', nombre: 'Alfa', activo: false },
      ],
      'Todas las bodegas',
    );
    expect(opciones).toEqual([
      { valor: null, texto: 'Todas las bodegas' },
      { valor: '1', texto: 'Alfa (inactiva)' },
      { valor: '2', texto: 'Zeta' },
    ]);
  });

  it('quita los filtros vacíos pero conserva el falso', () => {
    expect(filtrosSinVacios({ bodegaId: null, desde: '', tipo: 'a', incluirEnCero: false })).toEqual({
      tipo: 'a',
      incluirEnCero: false,
    });
  });
});
