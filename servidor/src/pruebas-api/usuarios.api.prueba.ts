import { beforeAll, describe, expect, it } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { CONTRASENA_DE_PRUEBA, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;

function nuevoUsuario(nombres: string, apellidos: string, extra: Record<string, unknown> = {}) {
  return {
    nombres,
    apellidos,
    contrasena: CONTRASENA_DE_PRUEBA,
    empresaIds: [cuenta.empresaId],
    ...extra,
  };
}

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Castillo', usuario: 'acastillo' });
});

describe('generación del nombre de usuario', () => {
  it('sugiere inicial del nombre más primer apellido', async () => {
    const respuesta = await cuenta.propietario.get('/api/usuarios/sugerencia?nombres=Juan&apellidos=López');

    expect(respuesta.cuerpo).toEqual({ usuario: 'jlopez' });
  });

  it('si ya existe, usa las iniciales de los dos nombres, el primer apellido y la inicial del segundo', async () => {
    const primero = await cuenta.propietario.post('/api/usuarios', nuevoUsuario('Anderson Martín', 'Parada Alburez'));
    const segundo = await cuenta.propietario.post(
      '/api/usuarios',
      nuevoUsuario('Anderson Magdiel', 'Parada Alvizures'),
    );

    expect(primero.cuerpo.usuario).toBe('aparada');
    expect(segundo.cuerpo.usuario).toBe('amparadaa');
  });

  it('rechaza un usuario escrito a mano con números', async () => {
    const respuesta = await cuenta.propietario.post(
      '/api/usuarios',
      nuevoUsuario('Pedro', 'Solís', { usuario: 'pedro2' }),
    );

    expect(respuesta.estado).toBe(400);
  });

  it('rechaza un usuario escrito a mano que ya está en uso', async () => {
    const respuesta = await cuenta.propietario.post(
      '/api/usuarios',
      nuevoUsuario('Pedro', 'Solís', { usuario: 'aparada' }),
    );

    expect(respuesta.estado).toBe(409);
  });
});

describe('administración de usuarios', () => {
  it('lista los usuarios de la cuenta', async () => {
    const respuesta = await cuenta.propietario.get('/api/usuarios');

    const usuarios = respuesta.cuerpo.map((u: { usuario: string }) => u.usuario);
    expect(usuarios).toEqual(expect.arrayContaining(['acastillo', 'aparada', 'amparadaa']));
  });

  it('exige al menos una empresa válida de la cuenta', async () => {
    const sinEmpresas = await cuenta.propietario.post(
      '/api/usuarios',
      nuevoUsuario('Sin', 'Empresas', { empresaIds: [] }),
    );
    const empresaAjena = await cuenta.propietario.post(
      '/api/usuarios',
      nuevoUsuario('Empresa', 'Ajena', { empresaIds: [crypto.randomUUID()] }),
    );

    expect(sinEmpresas.estado).toBe(400);
    expect(empresaAjena.estado).toBe(400);
  });

  it('un usuario desactivado ya no puede iniciar sesión', async () => {
    const creado = await cuenta.propietario.post('/api/usuarios', nuevoUsuario('Marta', 'Ixcoy'));

    const cambio = await cuenta.propietario.patch(`/api/usuarios/${creado.cuerpo.id}`, { activo: false });
    const intento = await entorno.nuevoCliente().iniciarSesion(creado.cuerpo.usuario, CONTRASENA_DE_PRUEBA);

    expect(cambio.estado).toBe(204);
    expect(intento.estado).toBe(401);
  });

  it('el administrador puede cambiar la contraseña de un usuario', async () => {
    const creado = await cuenta.propietario.post('/api/usuarios', nuevoUsuario('Carlos', 'Tzul'));

    const cambio = await cuenta.propietario.put(`/api/usuarios/${creado.cuerpo.id}/contrasena`, {
      contrasena: 'contrasena-nueva-segura',
    });
    const conLaNueva = await entorno.nuevoCliente().iniciarSesion(creado.cuerpo.usuario, 'contrasena-nueva-segura');

    expect(cambio.estado).toBe(204);
    expect(conLaNueva.estado).toBe(204);
  });

  it('rechaza contraseñas de menos de 10 caracteres', async () => {
    const respuesta = await cuenta.propietario.post(
      '/api/usuarios',
      nuevoUsuario('Corta', 'Clave', { contrasena: 'corta' }),
    );

    expect(respuesta.estado).toBe(400);
  });
});
