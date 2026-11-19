import { DireccionDeEnvio } from './direccion-de-envio.js';
import { ServidorDeCorreoInvalido } from './errores-del-servidor-de-correo.js';
import { esControlOBidireccional, sanearTexto } from './saneado.js';
import { nombreDeServidorValido } from './nombre-de-servidor.js';

/**
 * Solo hay dos formas de cifrar la conexión. «Sin cifrado» no existe aquí a propósito: el Mailpit de desarrollo
 * se alcanza con otro camino y el servidor de Soporte nunca manda credenciales en claro (C10).
 */
export const SEGURIDADES_DEL_SERVIDOR = ['tls_directo', 'starttls'] as const;
export type SeguridadDeConexion = (typeof SEGURIDADES_DEL_SERVIDOR)[number];

export const PUERTOS_DEL_SERVIDOR = [465, 587] as const;

const SEGURIDAD_DEL_PUERTO: Record<number, SeguridadDeConexion> = { 465: 'tls_directo', 587: 'starttls' };
const MAXIMO_DEL_USUARIO = 254;
const MAXIMO_DEL_NOMBRE_DEL_REMITENTE = 80;

/** Lo que Soporte escribe: texto sin validar. */
export interface EntradaDelServidor {
  readonly servidor: string;
  readonly puerto: number;
  readonly seguridad: string;
  readonly usuario: string;
  readonly remitenteDireccion: string;
  readonly remitenteNombre: string;
  readonly activo: boolean;
}

/** El servidor de correo de la instalación ya validado y normalizado. */
export interface DatosDelServidor {
  readonly servidor: string;
  readonly puerto: 465 | 587;
  readonly seguridad: SeguridadDeConexion;
  readonly usuario: string;
  readonly remitenteDireccion: string;
  readonly remitenteNombre: string;
  readonly activo: boolean;
}

export interface OpcionesDeValidacion {
  /** Solo desarrollo: deja apuntar a la red interna (C12). */
  readonly permitirRedInterna: boolean;
}

function exigirPuertoYSeguridad(puerto: number, seguridad: string): asserts puerto is 465 | 587 {
  const esperada = SEGURIDAD_DEL_PUERTO[puerto];
  if (!esperada) throw new ServidorDeCorreoInvalido('Use el puerto 465 (TLS directo) o el 587 (STARTTLS).');
  if (seguridad !== esperada) {
    throw new ServidorDeCorreoInvalido(
      `El puerto ${puerto} va con ${esperada === 'tls_directo' ? 'TLS directo' : 'STARTTLS'}.`,
    );
  }
}

function usuarioValido(usuario: string): string {
  const limpio = usuario.trim();
  const sinControles = [...limpio].every((c) => !esControlOBidireccional(c.codePointAt(0) as number));
  if (limpio.length < 1 || limpio.length > MAXIMO_DEL_USUARIO || !sinControles) {
    throw new ServidorDeCorreoInvalido(
      'El usuario del servidor de correo debe tener de 1 a 254 caracteres, sin controles.',
    );
  }
  return limpio;
}

function remitenteValido(
  direccion: string,
  nombre: string,
): Pick<DatosDelServidor, 'remitenteDireccion' | 'remitenteNombre'> {
  const nombreSaneado = sanearTexto(nombre, MAXIMO_DEL_NOMBRE_DEL_REMITENTE);
  if (nombreSaneado === '') throw new ServidorDeCorreoInvalido('Escriba el nombre visible del remitente.');
  return { remitenteDireccion: DireccionDeEnvio.crear(direccion.trim()).valor, remitenteNombre: nombreSaneado };
}

/**
 * Valida y normaliza el servidor de correo.
 * @throws ServidorDeCorreoInvalido si algo no cumple (también el nombre del servidor, C12).
 * @throws DireccionNoUtilizable si el remitente no sirve para enviar.
 */
export function validarServidorDeCorreo(entrada: EntradaDelServidor, opciones: OpcionesDeValidacion): DatosDelServidor {
  exigirPuertoYSeguridad(entrada.puerto, entrada.seguridad);
  return {
    servidor: nombreDeServidorValido(entrada.servidor, opciones.permitirRedInterna),
    puerto: entrada.puerto,
    seguridad: SEGURIDAD_DEL_PUERTO[entrada.puerto] as SeguridadDeConexion,
    usuario: usuarioValido(entrada.usuario),
    ...remitenteValido(entrada.remitenteDireccion, entrada.remitenteNombre),
    activo: entrada.activo,
  };
}
