import type { SeguridadDeConexion } from '../../dominio/servidor-de-correo.js';
import type { TransporteDeCorreo } from '../transporte-de-correo.js';

/** El servidor de correo listo para conectarse, con la contraseña ya descifrada (solo en memoria). */
export interface ConexionAlServidor {
  readonly servidor: string;
  readonly puerto: number;
  readonly seguridad: SeguridadDeConexion;
  readonly usuario: string;
  readonly contrasena: string;
}

/** Arma el transporte de un servidor. Quien lo pide lo cierra al terminar. */
export interface FabricaDeTransporte {
  crear(conexion: ConexionAlServidor): TransporteDeCorreo;
}
