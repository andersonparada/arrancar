import type { ServidorDeCorreoRepositorio } from '../puertos/servidor-de-correo-repositorio.js';

/** Qué debe decir el arranque sobre el envío de correo. */
export interface DiagnosticoDeLlave {
  /** `error` si ya hay un servidor guardado y el correo quedaría apagado sin que nadie lo note. */
  readonly nivel: 'info' | 'error';
  readonly mensaje: string;
}

const SIN_SERVIDOR =
  'El envío de correo está APAGADO: falta CLAVE_SECRETOS (openssl rand -base64 32). Aún no hay servidor de correo guardado.';
const CON_SERVIDOR =
  'El envío de correo está APAGADO: hay un servidor de correo guardado y falta CLAVE_SECRETOS, sin la cual no se puede ' +
  'leer su contraseña. Los correos esperan en la bandeja. Defina CLAVE_SECRETOS en el .env de producción (la misma de ' +
  'siempre, si ya se usó una) y reinicie la aplicación.';

/** Se usa al arrancar sin `CLAVE_SECRETOS`: con un servidor ya guardado es un error de instalación, no un simple aviso. */
export class DiagnosticarLlaveDeCorreo {
  constructor(private readonly servidores: ServidorDeCorreoRepositorio) {}

  async ejecutar(): Promise<DiagnosticoDeLlave> {
    const servidor = await this.servidores.obtener();
    return servidor ? { nivel: 'error', mensaje: CON_SERVIDOR } : { nivel: 'info', mensaje: SIN_SERVIDOR };
  }
}
