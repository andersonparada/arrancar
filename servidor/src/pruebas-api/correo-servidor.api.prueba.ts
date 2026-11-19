import { beforeAll, describe, expect, it } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const CONTRASENA = 'contrasena-smtp-muy-secreta';
const SERVIDOR = {
  servidor: 'smtp.proveedor.com',
  puerto: 587,
  seguridad: 'starttls',
  usuario: 'apikey',
  contrasena: CONTRASENA,
  remitenteDireccion: 'notificaciones@ejemplo.com',
  remitenteNombre: 'Arrancar',
  activo: true,
};
const RUTA = '/api/soporte/correo/servidor';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Correos', usuario: 'ccorreos' });
});

describe('servidor de correo (Soporte)', () => {
  it('solo el superacceso lo ve y lo cambia', async () => {
    expect((await cuenta.propietario.get(RUTA)).estado).toBe(403);
    expect((await cuenta.propietario.put(RUTA, SERVIDOR)).estado).toBe(403);
    expect((await cuenta.propietario.post('/api/soporte/correo/prueba', { destino: 'a@b.com' })).estado).toBe(403);
    expect((await entorno.nuevoCliente().get(RUTA)).estado).toBe(401);
  });

  it('sin nada guardado responde un servidor vacío y dice que hay llave', async () => {
    const respuesta = await entorno.soporte.get(RUTA);

    expect(respuesta.estado).toBe(200);
    expect(respuesta.cuerpo).toMatchObject({ configurado: false, contrasenaConfigurada: false, llaveDisponible: true });
  });

  it('guarda el servidor y nunca devuelve la contraseña, en la respuesta ni al leerlo', async () => {
    const guardado = await entorno.soporte.put(RUTA, SERVIDOR);
    const leido = await entorno.soporte.get(RUTA);

    expect(guardado.estado).toBe(200);
    expect(leido.cuerpo).toMatchObject({ servidor: 'smtp.proveedor.com', activo: true, contrasenaConfigurada: true });
    expect(JSON.stringify([guardado.cuerpo, leido.cuerpo])).not.toContain(CONTRASENA);
    expect(Object.keys(leido.cuerpo)).not.toContain('contrasena');
  });

  it('en la base la contraseña está cifrada, con IV de 12 bytes', async () => {
    const [fila] = await comoPropietario<{ contrasena_cifrada: Buffer; iv: Buffer; version_de_clave: number }>(
      'select contrasena_cifrada, iv, version_de_clave from core.servidor_de_correo',
      [],
    );

    expect(fila?.contrasena_cifrada.toString('utf8')).not.toContain(CONTRASENA);
    expect(fila?.contrasena_cifrada.length).toBe(Buffer.byteLength(CONTRASENA) + 16);
    expect(fila?.iv).toHaveLength(12);
  });

  it('la bitácora de superacceso lo registra sin la contraseña', async () => {
    const bitacora = await entorno.soporte.get('/api/plataforma/bitacora');
    const entrada = bitacora.cuerpo.find((e: { accion: string }) => e.accion === 'correo.servidor.guardar');

    expect(entrada.detalle).toMatchObject({ servidor: 'smtp.proveedor.com', contrasenaCambiada: true });
    expect(JSON.stringify(bitacora.cuerpo)).not.toContain(CONTRASENA);
  });

  it('sin contraseña nueva conserva la anterior', async () => {
    const { contrasena: _omitida, ...sinContrasena } = SERVIDOR;

    const respuesta = await entorno.soporte.put(RUTA, { ...sinContrasena, remitenteNombre: 'Arrancar Soporte' });

    expect(respuesta.cuerpo).toMatchObject({ remitenteNombre: 'Arrancar Soporte', contrasenaConfigurada: true });
  });

  it('al cambiar el servidor exige la contraseña otra vez', async () => {
    const { contrasena: _omitida, ...sinContrasena } = SERVIDOR;

    const respuesta = await entorno.soporte.put(RUTA, { ...sinContrasena, servidor: 'smtp.otro.com' });

    expect(respuesta.estado).toBe(400);
    expect(respuesta.cuerpo.error.codigo).toBe('servidor_de_correo_invalido');
  });

  it.each([
    ['sin cifrado', { seguridad: 'ninguna', puerto: 1025 }],
    ['puerto 25', { puerto: 25 }],
    ['465 con STARTTLS', { puerto: 465 }],
    ['servidor del compose', { servidor: 'postgres' }],
    ['IP privada', { servidor: '10.0.0.4' }],
    ['remitente con coma', { remitenteDireccion: 'a@x.com,b@y.com' }],
  ])('rechaza %s', async (_caso, cambio) => {
    const respuesta = await entorno.soporte.put(RUTA, { ...SERVIDOR, ...cambio });

    expect(respuesta.estado).toBe(400);
  });

  it('la tabla tampoco admite sin cifrado ni otros puertos, ni una segunda fila', async () => {
    const insertar = (seguridad: string, puerto: number, id = 'true') =>
      comoPropietario(
        `insert into core.servidor_de_correo (id, servidor, puerto, seguridad, usuario, remitente_direccion, remitente_nombre)
         values (${id}, 'x.com', $1, $2, 'u', 'a@x.com', 'A')`,
        [puerto, seguridad],
      );

    await expect(insertar('ninguna', 1025)).rejects.toThrow(/violates check constraint/);
    await expect(insertar('ninguna', 587)).rejects.toThrow(/violates check constraint/);
    await expect(insertar('starttls', 25)).rejects.toThrow(/violates check constraint/);
    await expect(insertar('starttls', 587, 'false')).rejects.toThrow(/violates check constraint/);
  });

  it('no deja activar sin contraseña en la base', async () => {
    await expect(
      comoPropietario(
        'update core.servidor_de_correo set contrasena_cifrada = null, iv = null, version_de_clave = null',
        [],
      ),
    ).rejects.toThrow(/violates check constraint/);
  });
});

describe('prueba de envío (Soporte)', () => {
  it('rechaza un destino que no sirve para enviar', async () => {
    const respuesta = await entorno.soporte.post('/api/soporte/correo/prueba', { destino: 'a@b.com,c@d.com' });

    expect(respuesta.estado).toBe(400);
    expect(respuesta.cuerpo.error.codigo).toBe('direccion_no_utilizable');
  });

  it('limita a 5 pruebas por hora por usuario', async () => {
    const respuestas = [];
    for (let i = 0; i < 6; i++) {
      respuestas.push(await entorno.soporte.post('/api/soporte/correo/prueba', { destino: 'a@b.com,c@d.com' }));
    }

    expect(respuestas.map((r) => r.estado)).toContain(429);
    expect(respuestas.at(-1)?.cuerpo.error.codigo).toBe('demasiadas_pruebas_de_correo');
  });
});
