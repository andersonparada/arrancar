import { Writable } from 'node:stream';
import pino from 'pino';
import { describe, expect, it } from 'vitest';
import { REDACCION_DEL_REGISTRO } from './registro-seguro.js';

function registrar(datos: object): string {
  let salida = '';
  const destino = new Writable({
    write(trozo, _codificacion, listo) {
      salida += String(trozo);
      listo();
    },
  });
  pino({ redact: REDACCION_DEL_REGISTRO }, destino).info(datos, 'prueba');
  return salida;
}

describe('redacción de los registros', () => {
  it('oculta contraseñas y credenciales, en la raíz y un nivel adentro', () => {
    const salida = registrar({
      contrasena: 'secreta-1',
      servidor: { contrasena: 'secreta-2', pass: 'secreta-3', auth: { user: 'u', pass: 'secreta-4' } },
      req: { headers: { authorization: 'Bearer secreta-5', cookie: 'sesion=secreta-6' } },
    });
    for (const numero of [1, 2, 3, 4, 5, 6]) expect(salida).not.toContain(`secreta-${numero}`);
    expect(salida).toContain('[Redacted]');
  });

  it('oculta también dos niveles adentro y otros nombres de secretos', () => {
    const salida = registrar({
      err: { config: { auth: { pass: 'secreta-1' } } },
      datos: { servidor: { contrasena: 'secreta-2' } },
      cuerpo: { password: 'secreta-3', contrasenaNueva: 'secreta-4', token: 'secreta-5', clave: 'secreta-6' },
    });
    for (const numero of [1, 2, 3, 4, 5, 6]) expect(salida).not.toContain(`secreta-${numero}`);
  });

  it('no toca el resto de los datos', () => {
    expect(registrar({ servidor: 'smtp.proveedor.com' })).toContain('smtp.proveedor.com');
  });
});
