import { describe, expect, it } from 'vitest';
import { DireccionNoUtilizable } from './errores-de-correo.js';
import { ServidorDeCorreoInvalido } from './errores-del-servidor-de-correo.js';
import { validarServidorDeCorreo, type EntradaDelServidor } from './servidor-de-correo.js';

const BASE: EntradaDelServidor = {
  servidor: 'SMTP.Proveedor.com',
  puerto: 587,
  seguridad: 'starttls',
  usuario: ' apikey ',
  remitenteDireccion: 'notificaciones@ejemplo.com',
  remitenteNombre: '  Arrancar ',
  activo: false,
};
const PRODUCCION = { permitirRedInterna: false };

describe('validarServidorDeCorreo', () => {
  it('normaliza el servidor, el usuario y el nombre del remitente', () => {
    expect(validarServidorDeCorreo(BASE, PRODUCCION)).toEqual({
      ...BASE,
      servidor: 'smtp.proveedor.com',
      usuario: 'apikey',
      remitenteNombre: 'Arrancar',
    });
  });

  it('acepta el 465 con TLS directo', () => {
    expect(validarServidorDeCorreo({ ...BASE, puerto: 465, seguridad: 'tls_directo' }, PRODUCCION).puerto).toBe(465);
  });

  it.each([
    ['sin cifrado', { seguridad: 'ninguna' }],
    ['puerto 25', { puerto: 25, seguridad: 'starttls' }],
    ['puerto 1025', { puerto: 1025, seguridad: 'ninguna' }],
    ['465 con STARTTLS', { puerto: 465, seguridad: 'starttls' }],
    ['587 con TLS directo', { puerto: 587, seguridad: 'tls_directo' }],
  ])('rechaza %s', (_caso, cambio) => {
    expect(() => validarServidorDeCorreo({ ...BASE, ...cambio }, PRODUCCION)).toThrow(ServidorDeCorreoInvalido);
  });

  it.each(['postgres', 'app', 'caddy', 'localhost', '127.0.0.1', '10.0.0.5', '172.20.1.1', '192.168.1.10'])(
    'rechaza el servidor interno %s (C12)',
    (servidor) => {
      expect(() => validarServidorDeCorreo({ ...BASE, servidor }, PRODUCCION)).toThrow(ServidorDeCorreoInvalido);
    },
  );

  it.each(['mail.empresa.local', 'host.internal', '::1', 'a b.com', 'smtp..com', '-x.com'])(
    'rechaza el nombre %s',
    (servidor) => {
      expect(() => validarServidorDeCorreo({ ...BASE, servidor }, PRODUCCION)).toThrow(ServidorDeCorreoInvalido);
    },
  );

  it('acepta una IP pública', () => {
    expect(validarServidorDeCorreo({ ...BASE, servidor: '203.0.113.7' }, PRODUCCION).servidor).toBe('203.0.113.7');
  });

  it('solo en desarrollo deja usar un nombre de la red interna', () => {
    const interno = { ...BASE, servidor: 'mailpit' };

    expect(validarServidorDeCorreo(interno, { permitirRedInterna: true }).servidor).toBe('mailpit');
  });

  it('rechaza un remitente que no sirve para enviar y un usuario con controles', () => {
    expect(() => validarServidorDeCorreo({ ...BASE, remitenteDireccion: 'a,b@x.com' }, PRODUCCION)).toThrow(
      DireccionNoUtilizable,
    );
    expect(() => validarServidorDeCorreo({ ...BASE, usuario: 'a\r\nb' }, PRODUCCION)).toThrow(ServidorDeCorreoInvalido);
    expect(() => validarServidorDeCorreo({ ...BASE, remitenteNombre: '\r\n' }, PRODUCCION)).toThrow(
      ServidorDeCorreoInvalido,
    );
  });
});
