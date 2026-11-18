import type { DireccionDeEnvio } from '../dominio/direccion-de-envio.js';

export interface PersonaDeCorreo {
  readonly direccion: DireccionDeEnvio;
  /** Nombre visible, ya saneado. */
  readonly nombre: string | null;
}

export interface AdjuntoDeCorreo {
  readonly nombre: string;
  /** Siempre un PDF generado por la app: nunca una ruta ni una URL. */
  readonly contenido: Buffer;
}

/** Un correo listo para salir: direcciones ya validadas y textos ya saneados. */
export interface MensajeDeSalida {
  readonly desde: PersonaDeCorreo;
  readonly responderA: DireccionDeEnvio | null;
  readonly para: readonly PersonaDeCorreo[];
  readonly copia: readonly PersonaDeCorreo[];
  readonly asunto: string;
  readonly texto: string;
  readonly html: string;
  readonly messageId: string;
  readonly adjuntos: readonly AdjuntoDeCorreo[];
}

/**
 * `temporal`: red, tiempo agotado o 4xx (se reintenta). `permanente`: 5xx (no se reintenta).
 * `autenticacion`: el servidor rechazó el usuario o la contraseña (no gasta intento).
 */
export type ResultadoDeEnvio = 'enviado' | 'temporal' | 'permanente' | 'autenticacion';

export interface RespuestaDeEnvio {
  readonly resultado: ResultadoDeEnvio;
  /** Código de red o SMTP (`ETIMEDOUT`, `EAUTH`, `550`); nunca el texto del servidor (C2, C11). */
  readonly codigo: string | null;
  /** Direcciones que el servidor no aceptó. */
  readonly rechazados: readonly string[];
  readonly duracionMs: number;
}

/** Puerto de salida de correo: lo implementan nodemailer y el doble en memoria. */
export interface TransporteDeCorreo {
  enviar(mensaje: MensajeDeSalida): Promise<RespuestaDeEnvio>;
  /** Cierra las conexiones abiertas (al apagar el proceso o al cambiar el servidor). */
  cerrar(): Promise<void>;
}
