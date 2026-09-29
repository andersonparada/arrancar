import { describe, expect, it } from 'vitest';
import type { DatosLocalidad, Localidad } from '../../servicios/localidades.api';
import { datosDeLocalidad, edicionDe, mensajeDeEliminacion } from './edicion-de-localidad';

const datos: DatosLocalidad = {
  codigo: 'Registro de prueba',
  nombre: 'Registro de prueba',
  tipoId: '00000000-0000-4000-8000-000000000001',
  codigoEstablecimientoSat: 7,
  nombreComercialSat: 'Registro de prueba',
  departamentoCodigo: '01',
  municipioCodigo: '0101',
  direccion: 'Registro de prueba',
  activo: true,
};
const localidad: Localidad = { id: 'registro-1', ...datos, tipoNombre: null };

describe('ventana de localidades', () => {
  it('lo que se abre para editar se manda igual si no se cambia nada', () => {
    expect(datosDeLocalidad(edicionDe(localidad))).toEqual(datos);
    expect(edicionDe(localidad).id).toBe(localidad.id);
  });

  it('un registro nuevo empieza sin id', () => {
    expect(edicionDe()).toMatchObject({ abierta: true, id: null });
  });

  it('lo que no se llena se manda como null', () => {
    expect(datosDeLocalidad(edicionDe())).toMatchObject({
      codigoEstablecimientoSat: null,
      nombreComercialSat: null,
      departamentoCodigo: null,
      municipioCodigo: null,
      direccion: null,
    });
  });

  it('el mensaje de eliminar dice qué localidad y qué pasa si está en uso', () => {
    const mensaje = mensajeDeEliminacion('Finca Norte');
    expect(mensaje).toContain('«Finca Norte»');
    expect(mensaje).toContain('inactívela');
  });
});
