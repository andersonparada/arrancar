import { describe, expect, it } from 'vitest';
import type { DatosCombustible, Combustible } from '../../servicios/combustibles.api';
import { datosDeCombustible, edicionDe } from './edicion-de-combustible';

const datos: DatosCombustible = {
  nombre: 'Registro de prueba',
  activo: true,
};
const combustible: Combustible = { id: 'registro-1', ...datos };

describe('ventana de combustibles', () => {
  it('lo que se abre para editar se manda igual si no se cambia nada', () => {
    expect(datosDeCombustible(edicionDe(combustible))).toEqual(datos);
    expect(edicionDe(combustible).id).toBe(combustible.id);
  });

  it('un registro nuevo empieza sin id', () => {
    expect(edicionDe()).toMatchObject({ abierta: true, id: null });
  });
});
