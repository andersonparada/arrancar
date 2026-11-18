import { esProduccion } from '../../../../configuracion.js';
import type { SMTPPoolOptions, SendMailOptions } from 'nodemailer';
import type {
  MensajeDeSalida,
  PersonaDeCorreo,
  RespuestaDeEnvio,
  ResultadoDeEnvio,
} from '../aplicacion/transporte-de-correo.js';

/**
 * `ninguna` existe solo para el Mailpit de desarrollo (puerto 1025, sin cifrado): la tabla del servidor de
 * Soporte solo debe admitir `tls_directo` y `starttls`. Aun así el adaptador se defiende: en producción
 * lanza error y sin cifrado nunca manda credenciales.
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

/**
 * Tiempos de espera del servidor SMTP. Deben quedar por debajo del arriendo de `core.correos_salientes`
 * (`bloqueado_hasta`, 5 minutos): un envío que tarde más se volvería a tomar y saldría duplicado.
 */
export const TIEMPOS_DE_ESPERA_SMTP = {
  connectionTimeout: 15_000,
  greetingTimeout: 15_000,
  socketTimeout: 60_000,
  dnsTimeout: 10_000,
} as const;

function credenciales({ seguridad, usuario, contrasena }: ConfiguracionDelServidor): SMTPPoolOptions['auth'] {
  if (seguridad === 'ninguna' || !usuario || !contrasena) return undefined;
  return { user: usuario, pass: contrasena };
}

function rechazarSinCifradoEnProduccion(seguridad: SeguridadDelServidor, esProduccionActual: boolean): void {
  if (seguridad === 'ninguna' && esProduccionActual) {
    throw new Error('El servidor de correo sin cifrado no se permite en producción.');
  }
}

/**
 * Opciones del único transporte por proceso (C2, C8, C10). Sin cifrado solo se permite fuera de producción
 * (`esProduccionActual` existe para probar la regla).
 */
export function opcionesDeTransporte(
  configuracion: ConfiguracionDelServidor,
  esProduccionActual: boolean = esProduccion,
): SMTPPoolOptions {
  const { servidor, puerto, seguridad } = configuracion;
  rechazarSinCifradoEnProduccion(seguridad, esProduccionActual);
  return {
    ...TIEMPOS_DE_ESPERA_SMTP,
    pool: true,
    maxConnections: 2,
    host: servidor,
    port: puerto,
    secure: seguridad === 'tls_directo',
    requireTLS: seguridad === 'starttls',
    ignoreTLS: seguridad === 'ninguna',
    name: NOMBRE_DE_PRESENTACION,
    tls: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
    auth: credenciales(configuracion),
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

const CODIGOS_DE_CONFIGURACION = ['EAUTH', 'ENOAUTH', 'ETLS'];
const CODIGOS_DE_MENSAJE_INVALIDO = ['EENVELOPE', 'EMESSAGE'];

function esFalloDeCertificado(code: unknown): boolean {
  return typeof code === 'string' && code.includes('CERT');
}

function resultadoDelError({ code, responseCode }: ErrorDeNodemailer): ResultadoDeEnvio {
  const esCodigo = (lista: readonly string[]): boolean => typeof code === 'string' && lista.includes(code);
  if (esCodigo(CODIGOS_DE_CONFIGURACION) || esFalloDeCertificado(code) || responseCode === 535) return 'autenticacion';
  if (typeof responseCode === 'number') return responseCode >= 500 && responseCode < 600 ? 'permanente' : 'temporal';
  return esCodigo(CODIGOS_DE_MENSAJE_INVALIDO) ? 'permanente' : 'temporal';
}

/** Clasifica un fallo de envío. Solo conserva códigos: el texto del servidor no se registra ni se muestra. */
export function clasificarError(error: unknown, duracionMs: number): RespuestaDeEnvio {
  const detalle = (error ?? {}) as ErrorDeNodemailer;
  return { resultado: resultadoDelError(detalle), codigo: codigoDelError(detalle), rechazados: [], duracionMs };
}
