import { describe, expect, it } from 'vitest';
import type { ServidorDeCorreo } from '../../servicios/correo-de-soporte.api';
import {
  borradorDe,
  datosParaGuardar,
  faltaLaContrasena,
  hayCambios,
  nombreDelTipoDeCorreo,
  textoDeLaPrueba,
  descripcionDelInterruptor,
  textoDelEstadoDelServidor,
} from './servidor-de-correo';

const GUARDADO: ServidorDeCorreo = {
  configurado: true,
  servidor: 'smtp.proveedor.com',
  puerto: 587,
  seguridad: 'starttls',
  usuario: 'apikey',
  remitenteDireccion: 'notificaciones@ejemplo.com',
  remitenteNombre: 'Arrancar',
  activo: true,
  contrasenaConfigurada: true,
  llaveDisponible: true,
  ultimaPrueba: null,
};

describe('borrador del servidor de correo', () => {
  it('empieza con la contraseña vacía: nunca llega del servidor', () => {
    expect(borradorDe(GUARDADO, 'Arrancar').contrasena).toBe('');
  });

  it('sin nombre de remitente guardado, propone el nombre de la aplicación', () => {
    expect(borradorDe({ ...GUARDADO, remitenteNombre: '' }, 'Mi Finca').remitenteNombre).toBe('Mi Finca');
  });

  it('sin tocar nada no hay cambios; una contraseña nueva o cualquier campo sí lo es', () => {
    const borrador = borradorDe(GUARDADO, 'Arrancar');

    expect(hayCambios(borrador, GUARDADO)).toBe(false);
    expect(hayCambios({ ...borrador, contrasena: 'nueva' }, GUARDADO)).toBe(true);
    expect(hayCambios({ ...borrador, usuario: 'otro' }, GUARDADO)).toBe(true);
  });
});

describe('lo que se guarda', () => {
  it('sin contraseña nueva no manda la contraseña: se conserva la guardada', () => {
    const datos = datosParaGuardar(borradorDe(GUARDADO, 'Arrancar'));

    expect('contrasena' in datos).toBe(false);
  });

  it('con contraseña nueva la manda tal cual, sin recortarla', () => {
    const datos = datosParaGuardar({ ...borradorDe(GUARDADO, 'Arrancar'), contrasena: ' con espacios ' });

    expect(datos.contrasena).toBe(' con espacios ');
  });

  it('la seguridad sale del puerto: 587 con STARTTLS y 465 con TLS directo', () => {
    const base = borradorDe(GUARDADO, 'Arrancar');

    expect(datosParaGuardar(base).seguridad).toBe('starttls');
    expect(datosParaGuardar({ ...base, puerto: 465 }).seguridad).toBe('tls_directo');
  });

  it('recorta los espacios de los textos', () => {
    const datos = datosParaGuardar({ ...borradorDe(GUARDADO, 'Arrancar'), servidor: '  smtp.x.com ', usuario: ' u ' });

    expect(datos).toMatchObject({ servidor: 'smtp.x.com', usuario: 'u' });
  });
});

describe('activar sin contraseña', () => {
  it('hace falta una contraseña si no hay guardada ni nueva', () => {
    const sin = { ...GUARDADO, contrasenaConfigurada: false };
    const borrador = borradorDe(sin, 'Arrancar');

    expect(faltaLaContrasena(borrador, sin)).toBe(true);
    expect(faltaLaContrasena({ ...borrador, contrasena: 'x' }, sin)).toBe(false);
    expect(faltaLaContrasena({ ...borrador, activo: false }, sin)).toBe(false);
    expect(faltaLaContrasena(borradorDe(GUARDADO, 'Arrancar'), GUARDADO)).toBe(false);
  });
});

describe('textos', () => {
  it('dice si el servidor está sin configurar, apagado o activo', () => {
    expect(textoDelEstadoDelServidor({ ...GUARDADO, configurado: false })).toContain('Sin configurar');
    expect(textoDelEstadoDelServidor({ ...GUARDADO, activo: false })).toContain('Apagado');
    expect(textoDelEstadoDelServidor(GUARDADO)).toContain('Activo');
  });

  it('la descripción del interruptor coincide con su posición', () => {
    expect(descripcionDelInterruptor(true)).toContain('Encendido');
    expect(descripcionDelInterruptor(false)).toContain('Apagado');
  });

  it('explica cada resultado de la prueba', () => {
    expect(textoDeLaPrueba('autenticacion')).toContain('contraseña');
    expect(textoDeLaPrueba('temporal')).toContain('conectar');
    expect(textoDeLaPrueba('enviado')).toContain('aceptó');
  });

  it('traduce el tipo conocido y deja el código del nuevo', () => {
    expect(nombreDelTipoDeCorreo('cuentas-por-pagar.aviso_de_pago')).toBe('Aviso de pago');
    expect(nombreDelTipoDeCorreo('bancos.aviso_de_cheque')).toBe('bancos.aviso_de_cheque');
  });
});
