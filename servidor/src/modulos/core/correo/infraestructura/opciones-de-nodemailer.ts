import type { SMTPPoolOptions, SendMailOptions } from 'nodemailer';
import type {
  MensajeDeSalida,
  PersonaDeCorreo,
  RespuestaDeEnvio,
  ResultadoDeEnvio,
} from '../aplicacion/transporte-de-correo.js';

/**
 * `ninguna` existe solo para el Mailpit de desarrollo (puerto 1025, sin cifrado): la tabla del servidor de
 * Soporte no la admite, así que en producción siempre se cifra.
 */
export type SeguridadDelServidor = 'tls_directo' | 'starttls' | 'ninguna';

export interface ConfiguracionDelServidor {
  readonly servidor: string;
  readonly puerto: number;
  readonly seguridad: SeguridadDelServidor;
  readonly usuario: string | null;
  readonly contrasena: string | null;
}

/** Nombre con que el transporte se presenta (EHLO): fijo en código, nunca viene de datos (GHSA-vvjj). */
const NOMBRE_DE_PRESENTACION = 'arrancar';

/** Opciones del único transporte por proceso (C2, C8, C10). */
export function opcionesDeTransporte(configuracion: ConfiguracionDelServidor): SMTPPoolOptions {
  const { servidor, puerto, seguridad, usuario, contrasena } = configuracion;
  return {
    pool: true,
    maxConnections: 2,
    host: servidor,
    port: puerto,
    secure: seguridad === 'tls_directo',
    requireTLS: seguridad === 'starttls',
    ignoreTLS: seguridad === 'ninguna',
    name: NOMBRE_DE_PRESENTACION,
    tls: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
    auth: usuario && contrasena ? { user: usuario, pass: contrasena } : undefined,
    logger: false,
    debug: false,
    disableFileAccess: true,
    disableUrlAccess: true,
  };
}

function personaParaNodemailer(persona: PersonaDeCorreo): { name: string; address: string } {
  return { name: persona.nombre ?? '', address: persona.direccion.valor };
}

/**
 * Mensaje de nodemailer con direcciones como objetos y `envelope` explícito (C6), adjuntos solo en memoria
 * y PDF fijo (C8), y `Auto-Submitted` para que los autorespondedores no contesten (RFC 3834). Nunca `raw`.
 */
export function opcionesDeMensaje(mensaje: MensajeDeSalida): SendMailOptions {
  const destinatarios = [...mensaje.para, ...mensaje.copia];
  return {
    from: personaParaNodemailer(mensaje.desde),
    replyTo: mensaje.responderA ? { name: '', address: mensaje.responderA.valor } : undefined,
    to: mensaje.para.map(personaParaNodemailer),
    cc: mensaje.copia.map(personaParaNodemailer),
    envelope: { from: mensaje.desde.direccion.valor, to: destinatarios.map((p) => p.direccion.valor) },
    subject: mensaje.asunto,
    text: mensaje.texto,
    html: mensaje.html,
    messageId: mensaje.messageId,
    headers: { 'Auto-Submitted': 'auto-generated' },
    attachments: mensaje.adjuntos.map((adjunto) => ({
      filename: adjunto.nombre,
      content: adjunto.contenido,
      contentType: 'application/pdf',
    })),
    disableFileAccess: true,
    disableUrlAccess: true,
  };
}

interface ErrorDeNodemailer {
  code?: unknown;
  responseCode?: unknown;
}

function codigoDelError({ code, responseCode }: ErrorDeNodemailer): string | null {
  if (typeof responseCode === 'number') return String(responseCode);
  return typeof code === 'string' ? code : null;
}

function resultadoDelError({ code, responseCode }: ErrorDeNodemailer): ResultadoDeEnvio {
  if (code === 'EAUTH' || code === 'ENOAUTH' || responseCode === 535) return 'autenticacion';
  const permanente = typeof responseCode === 'number' && responseCode >= 500 && responseCode < 600;
  return permanente ? 'permanente' : 'temporal';
}

/** Clasifica un fallo de envío. Solo conserva códigos: el texto del servidor no se registra ni se muestra. */
export function clasificarError(error: unknown, duracionMs: number): RespuestaDeEnvio {
  const detalle = (error ?? {}) as ErrorDeNodemailer;
  return { resultado: resultadoDelError(detalle), codigo: codigoDelError(detalle), rechazados: [], duracionMs };
}
