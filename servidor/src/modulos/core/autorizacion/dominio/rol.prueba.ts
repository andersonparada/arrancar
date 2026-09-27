import { describe, expect, it } from 'vitest';
import { Identificador } from '../../compartido/dominio/identificador.js';
import { NombreDeRolInvalido, RolAsignadoAUsuarios, SeNecesitaUnRolConAccesoTotal } from './errores.js';
import { Rol, type DatosDeRol } from './rol.js';

const cuentaId = Identificador.nuevo<'Cuenta'>();
const encargado: DatosDeRol = {
  nombre: '  Encargado ',
  descripcion: null,
  accesoTotal: false,
  permisos: ['usuarios.ver', 'usuarios.ver', 'roles.ver'],
};
const sinUso = { usuariosAsignados: 0, rolesConAccesoTotal: 2 };
const unicoConAccesoTotal = { usuariosAsignados: 0, rolesConAccesoTotal: 1 };

describe('Rol', () => {
  it('limpia el nombre y no repite permisos', () => {
    const rol = Rol.crear(cuentaId, encargado);

    expect(rol.instantanea()).toMatchObject({ nombre: 'Encargado', permisos: ['usuarios.ver', 'roles.ver'] });
  });

  it('con acceso total no guarda permisos sueltos: ya los tiene todos', () => {
    const rol = Rol.crear(cuentaId, { ...encargado, accesoTotal: true });

    expect(rol.instantanea().permisos).toEqual([]);
  });

  it('exige un nombre', () => {
    expect(() => Rol.crear(cuentaId, { ...encargado, nombre: '  ' })).toThrow(NombreDeRolInvalido);
  });

  it('no deja sin acceso total a la cuenta al cambiar ni al eliminar el último rol que lo tiene', () => {
    const propietario = Rol.propietario(cuentaId);

    expect(() => propietario.cambiar(encargado, unicoConAccesoTotal)).toThrow(SeNecesitaUnRolConAccesoTotal);
    expect(() => propietario.exigirQueSePuedaEliminar(unicoConAccesoTotal)).toThrow(SeNecesitaUnRolConAccesoTotal);
    expect(() => propietario.cambiar(encargado, sinUso)).not.toThrow();
  });

  it('no se elimina mientras algún usuario lo tenga', () => {
    const rol = Rol.crear(cuentaId, encargado);

    expect(() => rol.exigirQueSePuedaEliminar({ ...sinUso, usuariosAsignados: 1 })).toThrow(RolAsignadoAUsuarios);
    expect(() => rol.exigirQueSePuedaEliminar(sinUso)).not.toThrow();
  });
});
