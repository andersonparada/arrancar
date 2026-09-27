import { describe, expect, it } from 'vitest';
import type { Usuario } from '../../servicios/usuarios.api';
import { cambiosDelUsuario, datosDelNuevoUsuario, edicionDe, SIN_ACCESO, usuarioLimpio } from './edicion-de-usuario';

const ana: Usuario = {
  id: 'u1',
  usuario: 'alopez',
  nombres: 'Ana',
  apellidos: 'López',
  correo: null,
  activo: true,
  ultimoAccesoEn: null,
  accesos: [{ empresaId: 'e1', empresaNombre: 'Finca', rolId: 'r1', rolNombre: 'Encargado' }],
};

describe('edición de usuario', () => {
  it('pone un selector por empresa, sin acceso donde el usuario no entra', () => {
    expect(edicionDe(['e1', 'e2'], ana).rolPorEmpresa).toEqual({ e1: 'r1', e2: SIN_ACCESO });
  });

  it('un usuario nuevo empieza vacío y activo', () => {
    expect(edicionDe(['e1'])).toMatchObject({ usuarioId: null, nombres: '', activo: true, rolPorEmpresa: { e1: '' } });
  });

  it('al crear solo manda las empresas con rol y omite el usuario si no se escribió', () => {
    const edicion = { ...edicionDe(['e1', 'e2']), nombres: 'Luis', rolPorEmpresa: { e1: 'r1', e2: SIN_ACCESO } };

    const datos = datosDelNuevoUsuario(edicion);

    expect(datos.accesos).toEqual([{ empresaId: 'e1', rolId: 'r1' }]);
    expect(datos.usuario).toBeUndefined();
    expect(datos.correo).toBeNull();
  });

  it('quien se edita a sí mismo no manda su estado ni sus accesos', () => {
    const edicion = edicionDe(['e1'], ana);

    expect(cambiosDelUsuario(edicion, true)).not.toHaveProperty('accesos');
    expect(cambiosDelUsuario(edicion, false)).toMatchObject({ activo: true, accesos: [{ empresaId: 'e1' }] });
  });

  it('el usuario para iniciar sesión solo lleva letras minúsculas sin tilde', () => {
    expect(usuarioLimpio('José Ñuñez 2')).toBe('josenunez');
  });
});
