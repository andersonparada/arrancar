import { describe, expect, it } from 'vitest';
import type { DatosDepartamento, Departamento } from '../../servicios/departamentos.api';
import { datosDeDepartamento, edicionDe } from './edicion-de-departamento';

const datos: DatosDepartamento = {
  codigo: 'Registro de prueba',
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
