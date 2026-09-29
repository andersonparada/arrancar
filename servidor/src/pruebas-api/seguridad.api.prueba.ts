import { describe, expect, it } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';

const INTENTOS_PERMITIDOS_POR_MINUTO = 10;
const INICIOS_DE_SESION_AL_PREPARAR_EL_ENTORNO = 1;

const entorno = usarEntornoApi();

describe('seguridad general de la API', () => {
  it('responde que está viva sin pedir sesión', async () => {
    const respuesta = await entorno.nuevoCliente().get('/api/salud');

    expect(respuesta.estado).toBe(200);
    expect(respuesta.cuerpo).toEqual({ estado: 'ok' });
  });

  it('responde 404 en JSON para rutas de la API que no existen', async () => {
    const respuesta = await entorno.soporte.get('/api/no-existe');

    expect(respuesta.estado).toBe(404);
    expect(respuesta.cuerpo.error.codigo).toBe('no_encontrado');
  });

  it('rechaza cambios que vienen de otro sitio web', async () => {
    const respuesta = await entorno
      .nuevoCliente()
      .postDesdeOtroOrigen(
        '/api/autenticacion/iniciar-sesion',
        { usuario: 'x', contrasena: 'x' },
        'https://sitio-malicioso.com',
      );

    expect(respuesta.estado).toBe(403);
  });

  it('envía cabeceras de seguridad', async () => {
    const respuesta = await entorno.nuevoCliente().get('/api/salud');

    expect(respuesta.cabeceras['content-security-policy']).toContain("default-src 'self'");
    expect(respuesta.cabeceras['x-content-type-options']).toBe('nosniff');
  });

  it('bloquea el inicio de sesión tras demasiados intentos en un minuto', async () => {
    const atacante = entorno.nuevoCliente();
    const intentar = () => atacante.iniciarSesion('supergod', 'adivinando');

    const intentosDisponibles = INTENTOS_PERMITIDOS_POR_MINUTO - INICIOS_DE_SESION_AL_PREPARAR_EL_ENTORNO;
    for (let intento = 1; intento < intentosDisponibles; intento++) await intentar();
    const ultimoPermitido = await intentar();
    const bloqueado = await intentar();

    expect(ultimoPermitido.estado).toBe(401);
    expect(bloqueado.estado).toBe(429);
    expect(bloqueado.cuerpo.error.codigo).toBe('demasiadas_solicitudes');
    expect(bloqueado.cuerpo.error.mensaje).toContain('demasiados intentos');
  });
});
