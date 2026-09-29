import { describe, expect, it } from 'vitest';
import type { DatosDepartamento, Departamento } from '../../servicios/departamentos.api';
import { codigoEnMayusculas, datosDeDepartamento, edicionDe, mensajeDeEliminacion } from './edicion-de-departamento';

const datos: DatosDepartamento = {
  codigo: 'GT-01',
  nombre: 'Registro de prueba',
  localidadId: '00000000-0000-4000-8000-000000000001',
  activo: true,
};
const departamento: Departamento = { id: 'registro-1', ...datos, localidadNombre: null };

describe('ventana de departamentos', () => {
  it('lo que se abre para editar se manda igual si no se cambia nada', () => {
    expect(datosDeDepartamento(edicionDe(departamento))).toEqual(datos);
    expect(edicionDe(departamento).id).toBe(departamento.id);
  });

  it('un registro nuevo empieza sin id', () => {
    expect(edicionDe()).toMatchObject({ abierta: true, id: null });
  });

  it('lo que no se llena se manda como null', () => {
    expect(datosDeDepartamento(edicionDe())).toMatchObject({ localidadId: null });
  });
});

describe('código y eliminación de departamentos', () => {
  it('el código se manda en mayúsculas y sin espacios', () => {
    const edicion = { ...edicionDe(), codigo: ' gt 01 ' };
    expect(datosDeDepartamento(edicion).codigo).toBe('GT01');
    expect(codigoEnMayusculas('ab-1')).toBe('AB-1');
  });

  it('la confirmación de eliminar nombra el departamento y ofrece inactivarlo', () => {
    const mensaje = mensajeDeEliminacion('Ventas');
    expect(mensaje).toContain('«Ventas»');
    expect(mensaje).toContain('inactívelo');
  });
});
