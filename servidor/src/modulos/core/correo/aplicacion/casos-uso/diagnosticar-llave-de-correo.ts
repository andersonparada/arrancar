import { CONTEXTO_DE_LA_CONTRASENA } from '../contexto-de-la-contrasena.js';
import type { CifradorDeSecretos } from '../puertos/cifrador-de-secretos.js';
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

const NO_DESCIFRA =
  'El envío de correo FALLARÁ: CLAVE_SECRETOS (y CLAVE_SECRETOS_ANTERIOR, si se rota) no descifra la contraseña del ' +
  'servidor de correo guardado. Los correos esperan en la bandeja. Ponga la llave con que se guardó, o vuelva a ' +
  'guardar la contraseña del servidor desde Soporte.';

/**
 * Se usa al arrancar. Sin `CLAVE_SECRETOS` y con un servidor ya guardado es un error de instalación, no un simple
 * aviso; con ella, se comprueba que descifre la contraseña guardada (sin mostrarla ni su causa).
 */
export class DiagnosticarLlaveDeCorreo {
  constructor(
    private readonly servidores: ServidorDeCorreoRepositorio,
    private readonly cifrador: CifradorDeSecretos,
  ) {}

  /** @returns un error claro si la llave está pero no abre la contraseña guardada; `null` si todo está en orden. */
  async verificarContrasena(): Promise<DiagnosticoDeLlave | null> {
    const secreto = (await this.servidores.obtener())?.contrasena;
    if (!secreto) return null;
    try {
      this.cifrador.descifrar(secreto, CONTEXTO_DE_LA_CONTRASENA);
      return null;
    } catch {
      return { nivel: 'error', mensaje: NO_DESCIFRA };
    }
  }

  async ejecutar(): Promise<DiagnosticoDeLlave> {
    const servidor = await this.servidores.obtener();
    return servidor ? { nivel: 'error', mensaje: CON_SERVIDOR } : { nivel: 'info', mensaje: SIN_SERVIDOR };
  }
}
