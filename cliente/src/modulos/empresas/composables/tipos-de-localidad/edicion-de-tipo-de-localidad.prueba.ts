import { describe, expect, it } from 'vitest';
import type { DatosTipoDeLocalidad, TipoDeLocalidad } from '../../servicios/tipos-de-localidad.api';
import { datosDeTipoDeLocalidad, edicionDe } from './edicion-de-tipo-de-localidad';

const datos: DatosTipoDeLocalidad = {
  nombre: 'Registro de prueba',
  activo: true,
};
const tipoDeLocalidad: TipoDeLocalidad = { id: 'registro-1', ...datos };

describe('ventana de tipos de localidad', () => {
  it('lo que se abre para editar se manda igual si no se cambia nada', () => {
    expect(datosDeTipoDeLocalidad(edicionDe(tipoDeLocalidad))).toEqual(datos);
    expect(edicionDe(tipoDeLocalidad).id).toBe(tipoDeLocalidad.id);
  });

  it('un registro nuevo empieza sin id', () => {
    expect(edicionDe()).toMatchObject({ abierta: true, id: null });
  });
});
