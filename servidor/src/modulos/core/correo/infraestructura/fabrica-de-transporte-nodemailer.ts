import { configuracion as entorno, esProduccion } from '../../../../configuracion.js';
import type { ConexionAlServidor, FabricaDeTransporte } from '../aplicacion/puertos/fabrica-de-transporte.js';
import type { TransporteDeCorreo } from '../aplicacion/transporte-de-correo.js';
import { TransporteNodemailer } from './transporte-nodemailer.js';

/** Un servidor de correo de mentira (Mailpit) al que apuntan los correos en desarrollo. */
export interface DestinoDeDesarrollo {
  readonly servidor: string;
  readonly puerto: number;
}

/**
 * El destino de desarrollo que pide el entorno (`CORREO_DESARROLLO_SERVIDOR`), o `null`. En producción nunca hay: la
 * variable se rechaza al arrancar y aquí se vuelve a comprobar (`esProduccionActual` existe para probar la regla).
 */
export function destinoDeDesarrolloDelEntorno(
  variables: { CORREO_DESARROLLO_SERVIDOR?: string | undefined; CORREO_DESARROLLO_PUERTO: number } = entorno,
  esProduccionActual: boolean = esProduccion,
): DestinoDeDesarrollo | null {
  if (!variables.CORREO_DESARROLLO_SERVIDOR) return null;
  if (esProduccionActual) throw new Error('El servidor de correo de desarrollo no se permite en producción.');
  return { servidor: variables.CORREO_DESARROLLO_SERVIDOR, puerto: variables.CORREO_DESARROLLO_PUERTO };
}

/**
 * Crea un transporte SMTP de nodemailer por conexión. Con un destino de desarrollo ignora el servidor guardado y manda
 * sin cifrado ni credenciales al servidor de mentira: así se prueba el correo de punta a punta sin mandar nada afuera.
 */
export class FabricaDeTransporteNodemailer implements FabricaDeTransporte {
  constructor(private readonly desarrollo: DestinoDeDesarrollo | null = null) {}

  crear(conexion: ConexionAlServidor): TransporteDeCorreo {
    if (this.desarrollo) {
      const { servidor, puerto } = this.desarrollo;
      return new TransporteNodemailer({ servidor, puerto, seguridad: 'ninguna', usuario: null, contrasena: null });
    }
    return new TransporteNodemailer(conexion);
  }
}
