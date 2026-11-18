import { createTransport } from 'nodemailer';
import { describe, expect, it } from 'vitest';
import type { MensajeDeSalida, PersonaDeCorreo } from '../aplicacion/transporte-de-correo.js';
import { DireccionDeEnvio } from '../dominio/direccion-de-envio.js';
import {
  TIEMPOS_DE_ESPERA_SMTP,
  clasificarError,
  opcionesDeMensaje,
  opcionesDeTransporte,
} from './opciones-de-nodemailer.js';
import { TransporteEnMemoria } from './transporte-en-memoria.js';
import { TransporteNodemailer } from './transporte-nodemailer.js';

function persona(direccion: string, nombre: string | null = null): PersonaDeCorreo {
  return { direccion: DireccionDeEnvio.crear(direccion), nombre };
}

function mensajeDePrueba(): MensajeDeSalida {
  return {
    desde: persona('notificaciones@arrancar.gt', 'Finca El Sol por medio de Arrancar'),
    responderA: DireccionDeEnvio.crear('contacto@finca.gt'),
    para: [persona('proveedor@x.com', 'Proveedor, S.A.')],
    copia: [persona('contacto@finca.gt')],
    asunto: 'Aviso de pago 12 – Finca El Sol',
    texto: 'Hola',
    html: '<p>Hola</p>',
    messageId: '<abc@arrancar.gt>',
    adjuntos: [{ nombre: 'comprobante-de-pago-12.pdf', contenido: Buffer.from('%PDF-1.4') }],
  };
}

describe('opcionesDeTransporte', () => {
  const base = { servidor: 'smtp.proveedor.com', puerto: 587, usuario: 'u', contrasena: 'clave' };

  it('en el 587 exige STARTTLS, TLS 1.2 y certificado válido, y apaga los registros', () => {
    const opciones = opcionesDeTransporte({ ...base, seguridad: 'starttls' });
    expect(opciones).toMatchObject({ secure: false, requireTLS: true, ignoreTLS: false, pool: true });
    expect(opciones).toMatchObject({ maxConnections: 2, logger: false, debug: false, name: 'arrancar' });
    expect(opciones).toMatchObject({ disableFileAccess: true, disableUrlAccess: true });
    expect(opciones.tls).toEqual({ minVersion: 'TLSv1.2', rejectUnauthorized: true });
  });

  it('en el 465 usa TLS directo', () => {
    const opciones = opcionesDeTransporte({ ...base, puerto: 465, seguridad: 'tls_directo' });
    expect(opciones).toMatchObject({ secure: true, requireTLS: false });
  });
});

describe('opcionesDeTransporte: defensas', () => {
  const base = { servidor: 'smtp.proveedor.com', puerto: 587, usuario: 'u', contrasena: 'clave' };

  it('fija tiempos de espera menores que el arriendo de 5 minutos', () => {
    const opciones = opcionesDeTransporte({ ...base, seguridad: 'starttls' });
    expect(opciones).toMatchObject({
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 60_000,
      dnsTimeout: 10_000,
    });
    expect(Object.values(TIEMPOS_DE_ESPERA_SMTP).every((ms) => ms < 5 * 60_000)).toBe(true);
  });

  it('sin cifrado no manda credenciales y en producción se rechaza', () => {
    const opciones = opcionesDeTransporte({ ...base, seguridad: 'ninguna' }, false);
    expect(opciones.auth).toBeUndefined();
    expect(() => opcionesDeTransporte({ ...base, seguridad: 'ninguna' }, true)).toThrow(/producción/);
  });

  it('con cifrado manda las credenciales', () => {
    expect(opcionesDeTransporte({ ...base, seguridad: 'starttls' }).auth).toEqual({ user: 'u', pass: 'clave' });
  });
});

describe('opcionesDeMensaje', () => {
  it('arma direcciones como objetos, envelope explícito y cabecera de envío automático', () => {
    const opciones = opcionesDeMensaje(mensajeDePrueba());
    expect(opciones.to).toEqual([{ name: 'Proveedor, S.A.', address: 'proveedor@x.com' }]);
    expect(opciones.envelope).toEqual({
      from: 'notificaciones@arrancar.gt',
      to: ['proveedor@x.com', 'contacto@finca.gt'],
    });
    expect(opciones.headers).toEqual({ 'Auto-Submitted': 'auto-generated' });
    expect(opciones).toMatchObject({ disableFileAccess: true, disableUrlAccess: true });
    expect(opciones).not.toHaveProperty('raw');
    expect(opciones.attachments).toEqual([
      { filename: 'comprobante-de-pago-12.pdf', content: Buffer.from('%PDF-1.4'), contentType: 'application/pdf' },
    ]);
  });
});

describe('clasificarError', () => {
  it.each([
    [{ code: 'EAUTH', responseCode: 535 }, 'autenticacion', '535'],
    [{ code: 'EAUTH' }, 'autenticacion', 'EAUTH'],
    [{ code: 'EENVELOPE', responseCode: 550 }, 'permanente', '550'],
    [{ code: 'EMESSAGE', responseCode: 451 }, 'temporal', '451'],
    [{ code: 'ETIMEDOUT' }, 'temporal', 'ETIMEDOUT'],
    [{ code: 'EENVELOPE' }, 'permanente', 'EENVELOPE'],
    [{ code: 'EMESSAGE' }, 'permanente', 'EMESSAGE'],
    [{ code: 'ETLS' }, 'autenticacion', 'ETLS'],
    [{ code: 'CERT_HAS_EXPIRED' }, 'autenticacion', 'CERT_HAS_EXPIRED'],
    [new Error('algo raro con datos personales'), 'temporal', null],
  ])('%j es %s', (error, resultado, codigo) => {
    expect(clasificarError(error, 5)).toEqual({ resultado, codigo, rechazados: [], duracionMs: 5 });
  });
});

describe('TransporteNodemailer', () => {
  const configuracion = { servidor: 'x', puerto: 587, seguridad: 'starttls', usuario: null, contrasena: null } as const;

  it('manda el correo completo con un transporte JSON (sin red)', async () => {
    const transporte = new TransporteNodemailer(configuracion, createTransport({ jsonTransport: true }));
    const respuesta = await transporte.enviar(mensajeDePrueba());
    expect(respuesta).toMatchObject({ resultado: 'enviado', codigo: null, rechazados: [] });
  });

  it('el mensaje armado lleva a cada quien en su campo y el adjunto con su nombre', async () => {
    const enviado = await createTransport({ jsonTransport: true }).sendMail(opcionesDeMensaje(mensajeDePrueba()));
    const json = JSON.parse(enviado.message as string) as Record<string, unknown>;
    expect(json.subject).toBe('Aviso de pago 12 – Finca El Sol');
    expect(JSON.stringify(json.to)).toContain('proveedor@x.com');
    expect(JSON.stringify(json.cc)).toContain('contacto@finca.gt');
    expect(JSON.stringify(json.attachments)).toContain('comprobante-de-pago-12.pdf');
  });

  it('un fallo del transporte se vuelve una respuesta clasificada, sin lanzar', async () => {
    const falla = {
      sendMail: () => Promise.reject(Object.assign(new Error('x'), { responseCode: 550 })),
      close: () => {},
    };
    const respuesta = await new TransporteNodemailer(configuracion, falla).enviar(mensajeDePrueba());
    expect(respuesta).toMatchObject({ resultado: 'permanente', codigo: '550' });
  });

  it('cierra el transporte', async () => {
    let cerrado = false;
    const transporte = { sendMail: () => Promise.resolve({}), close: () => (cerrado = true) };
    await new TransporteNodemailer(configuracion, transporte as never).cerrar();
    expect(cerrado).toBe(true);
  });
});

describe('TransporteEnMemoria', () => {
  it('guarda lo enviado y responde lo programado', async () => {
    const transporte = new TransporteEnMemoria();
    transporte.programarRespuesta({ resultado: 'temporal', codigo: 'ETIMEDOUT' });
    expect((await transporte.enviar(mensajeDePrueba())).resultado).toBe('temporal');
    expect((await transporte.enviar(mensajeDePrueba())).resultado).toBe('enviado');
    expect(transporte.enviados).toHaveLength(1);
    await transporte.cerrar();
    expect(transporte.cerrado).toBe(true);
  });
});
