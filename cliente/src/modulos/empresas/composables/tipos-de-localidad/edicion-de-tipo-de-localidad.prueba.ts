import { describe, expect, it } from 'vitest';
import type { DatosTipoDeLocalidad, TipoDeLocalidad } from '../../servicios/tipos-de-localidad.api';
import {
  datosDeTipoDeLocalidad,
  edicionDe,
  LARGO_MAXIMO_DEL_NOMBRE,
  mensajeDeEliminacion,
} from './edicion-de-tipo-de-localidad';

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

  it('el nombre se manda sin espacios de los lados y sin pasar de 60 caracteres', () => {
    const edicion = { ...edicionDe(), nombre: `  ${'a'.repeat(80)}  ` };
    expect(datosDeTipoDeLocalidad(edicion).nombre).toHaveLength(LARGO_MAXIMO_DEL_NOMBRE);
    expect(LARGO_MAXIMO_DEL_NOMBRE).toBe(60);
  });

  it('la confirmación de eliminar nombra el tipo y ofrece inactivarlo', () => {
    const mensaje = mensajeDeEliminacion('Finca');
    expect(mensaje).toContain('«Finca»');
    expect(mensaje).toContain('inactívelo');
  });
});
