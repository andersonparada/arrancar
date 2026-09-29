import { describe, expect, it } from 'vitest';
import { opcionesDeGeografia, opcionesDeTipos } from './opciones-de-localidad';

const tipos = [
  { id: 'b', nombre: 'Planta', activo: true },
  { id: 'a', nombre: 'Finca', activo: true },
  { id: 'c', nombre: 'Bodega vieja', activo: false },
];

describe('opciones de la localidad', () => {
  it('los tipos salen por nombre y sin los inactivos', () => {
    expect(opcionesDeTipos(tipos, null).map((o) => o.texto)).toEqual(['Elija una opción', 'Finca', 'Planta']);
  });

  it('conserva el tipo inactivo que la localidad ya tiene', () => {
    expect(opcionesDeTipos(tipos, 'c').map((o) => o.valor)).toEqual([null, 'c', 'a', 'b']);
  });

  it('departamentos ordenados con la opción de no registrar', () => {
    const opciones = opcionesDeGeografia([
      { codigo: '02', nombre: 'Zacapa' },
      { codigo: '01', nombre: 'Alta Verapaz' },
    ]);
    expect(opciones.map((o) => o.texto)).toEqual(['Sin registrar', 'Alta Verapaz', 'Zacapa']);
  });
});
