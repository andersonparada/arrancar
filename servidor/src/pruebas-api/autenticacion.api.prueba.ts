import { beforeAll, describe, expect, it } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { CONTRASENA_DE_PRUEBA, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Lopez', usuario: 'jlopez' });
});

describe('inicio de sesión', () => {
  it('entrega la cookie de sesión con usuario y contraseña correctos', async () => {
    const navegador = entorno.nuevoCliente();

    const respuesta = await navegador.iniciarSesion('jlopez', CONTRASENA_DE_PRUEBA);

    expect(respuesta.estado).toBe(204);
    expect(navegador.tieneSesion).toBe(true);
  });

  it('no distingue mayúsculas en el nombre de usuario', async () => {
    const respuesta = await entorno.nuevoCliente().iniciarSesion('JLopez', CONTRASENA_DE_PRUEBA);

    expect(respuesta.estado).toBe(204);
  });

  it('rechaza una contraseña incorrecta sin decir si el usuario existe', async () => {
    const contrasenaMala = await entorno.nuevoCliente().iniciarSesion('jlopez', 'no-es-la-contrasena');
    const usuarioInexistente = await entorno.nuevoCliente().iniciarSesion('nadie', 'no-es-la-contrasena');

    expect(contrasenaMala.estado).toBe(401);
    expect(usuarioInexistente.estado).toBe(401);
    expect(contrasenaMala.cuerpo.error.mensaje).toBe(usuarioInexistente.cuerpo.error.mensaje);
  });

  it('pide los datos que faltan', async () => {
    const respuesta = await entorno.nuevoCliente().post('/api/autenticacion/iniciar-sesion', { usuario: 'jlopez' });

    expect(respuesta.estado).toBe(400);
    expect(respuesta.cuerpo.error.codigo).toBe('validacion');
  });
});

describe('sesión', () => {
  it('sin sesión, las rutas protegidas responden 401', async () => {
    const respuesta = await entorno.nuevoCliente().get('/api/sesion');

    expect(respuesta.estado).toBe(401);
    expect(respuesta.cuerpo.error.codigo).toBe('no_autenticado');
  });

  it('activa sola la empresa cuando el usuario solo tiene una', async () => {
    const sesion = await cuenta.propietario.get('/api/sesion');

    expect(sesion.estado).toBe(200);
    expect(sesion.cuerpo).toMatchObject({
      usuario: { usuario: 'jlopez', esSuperacceso: false },
      empresa: { id: cuenta.empresaId },
      rolNombre: 'Propietario',
    });
    expect(sesion.cuerpo.permisos).toContain('usuarios.crear');
    expect(sesion.cuerpo.empresasDisponibles).toHaveLength(1);
  });

  it('soporte no entra solo a ninguna empresa y ve todas las disponibles', async () => {
    const sesion = await entorno.soporte.get('/api/sesion');

    expect(sesion.cuerpo.empresa).toBeNull();
    expect(sesion.cuerpo.usuario.esSuperacceso).toBe(true);
    expect(sesion.cuerpo.empresasDisponibles.map((e: { id: string }) => e.id)).toContain(cuenta.empresaId);
  });

  it('no deja cambiar a una empresa a la que el usuario no tiene acceso', async () => {
    const otra = await darDeAltaCuenta(entorno, { nombre: 'Garcia', usuario: 'mgarcia' });

    const respuesta = await cuenta.propietario.put('/api/sesion/empresa-activa', { empresaId: otra.empresaId });

    expect(respuesta.estado).toBe(404);
  });

  it('al cerrar sesión la cookie deja de servir', async () => {
    const navegador = entorno.nuevoCliente();
    await navegador.iniciarSesion('jlopez', CONTRASENA_DE_PRUEBA);

    const cierre = await navegador.post('/api/autenticacion/cerrar-sesion');

    expect(cierre.estado).toBe(204);
    expect(navegador.tieneSesion).toBe(false);
    expect((await navegador.get('/api/sesion')).estado).toBe(401);
  });
});
