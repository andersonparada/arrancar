import { describe, expect, it } from 'vitest';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { Departamento, DepartamentoInvalido, type DatosDeDepartamento } from './departamento.js';

const empresaId = Identificador.nuevo<'Empresa'>();

const datos = (cambios: Partial<DatosDeDepartamento> = {}): DatosDeDepartamento => ({
  codigo: 'con-01',
  nombre: '  Contabilidad ',
  localidadId: null,
  activo: true,
  ...cambios,
});

describe('Departamento', () => {
  it('pasa el código a mayúsculas y recorta el nombre', () => {
    const { codigo, nombre } = Departamento.crear(empresaId, datos()).instantanea();

    expect([codigo, nombre]).toEqual(['CON-01', 'Contabilidad']);
  });

  it('puede no tener localidad', () => {
    expect(Departamento.crear(empresaId, datos()).instantanea().localidadId).toBeNull();
  });

  it.each([
    ['sin código', { codigo: ' ' }],
    ['con código de más de 12 caracteres', { codigo: 'ABCDEFGHIJKLM' }],
    ['con código con espacios', { codigo: 'AB CD' }],
    ['sin nombre', { nombre: ' ' }],
  ])('no se crea %s', (_caso, cambios) => {
    expect(() => Departamento.crear(empresaId, datos(cambios))).toThrow(DepartamentoInvalido);
  });

  it('al cambiar sus datos vuelve a validar', () => {
    const departamento = Departamento.crear(empresaId, datos());

    expect(() => departamento.cambiarDatos(datos({ codigo: '' }))).toThrow(DepartamentoInvalido);
  });
});
