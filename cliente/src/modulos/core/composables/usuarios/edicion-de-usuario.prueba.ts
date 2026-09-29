import { describe, expect, it } from 'vitest';
import type { Usuario } from '../../servicios/usuarios.api';
import { cambiosDelUsuario, datosDelNuevoUsuario, edicionDe, usuarioLimpio } from './edicion-de-usuario';

const ana: Usuario = {
  id: 'u1',
  usuario: 'alopez',
  nombres: 'Ana',
  apellidos: 'López',
  correo: null,
  activo: true,
  ultimoAccesoEn: null,
  empresas: [{ empresaId: 'e1', empresaNombre: 'Finca' }],
  roles: [{ rolId: 'r1', rolNombre: 'Encargado', accesoTotal: false }],
  totalPermisosDirectos: 0,
};

describe('edición de usuario', () => {
  it('al editar marca las empresas donde el usuario entra', () => {
    expect(edicionDe('e2', ana).empresaIds).toEqual(['e1']);
  });

  it('un usuario nuevo empieza vacío, activo y entrando a la empresa activa', () => {
    expect(edicionDe('e1')).toMatchObject({ usuarioId: null, nombres: '', activo: true, empresaIds: ['e1'] });
    expect(edicionDe(null).empresaIds).toEqual([]);
  });

  it('al crear manda las empresas y omite usuario, roles y permisos si no hay nada que mandar', () => {
    const datos = datosDelNuevoUsuario({ ...edicionDe('e1'), nombres: 'Luis', rolIds: ['r1'] }, false);

    expect(datos.empresaIds).toEqual(['e1']);
    expect(datos.usuario).toBeUndefined();
    expect(datos.correo).toBeNull();
    expect(datos).not.toHaveProperty('rolIds');
    expect(datos).not.toHaveProperty('permisos');
  });

  it('quien puede asignar permisos manda los roles y permisos que eligió', () => {
    const edicion = { ...edicionDe('e1'), rolIds: ['r1'], permisos: ['terceros.ver'] };

    expect(datosDelNuevoUsuario(edicion, true)).toMatchObject({ rolIds: ['r1'], permisos: ['terceros.ver'] });
    expect(datosDelNuevoUsuario({ ...edicion, permisos: [] }, true)).not.toHaveProperty('permisos');
  });

  it('quien se edita a sí mismo no manda su estado ni sus accesos', () => {
    const edicion = edicionDe('e1', ana);

    expect(cambiosDelUsuario(edicion, true)).not.toHaveProperty('empresaIds');
    expect(cambiosDelUsuario(edicion, false)).toMatchObject({ activo: true, empresaIds: ['e1'] });
  });

  it('el usuario para iniciar sesión solo lleva letras minúsculas sin tilde', () => {
    expect(usuarioLimpio('José Ñuñez 2')).toBe('josenunez');
  });
});
