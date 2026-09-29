import { describe, expect, it } from 'vitest';
import { opcionesDeLocalidades } from './opciones-de-departamento';

const localidades = [
  { id: 'b', nombre: 'Zacapa', activo: true },
  { id: 'a', nombre: 'Álamo', activo: true },
  { id: 'c', nombre: 'Cerrada', activo: false },
];

describe('localidades del departamento', () => {
  it('ofrece «Sin localidad» primero y las activas por nombre', () => {
    const opciones = opcionesDeLocalidades(localidades, null);
    expect(opciones.map((o) => o.texto)).toEqual(['Sin localidad', 'Álamo', 'Zacapa']);
    expect(opciones[0]?.valor).toBeNull();
  });

  it('conserva la localidad actual aunque esté inactiva', () => {
    expect(opcionesDeLocalidades(localidades, 'c').map((o) => o.valor)).toContain('c');
  });
});
