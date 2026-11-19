import type { ConexionAlServidor, FabricaDeTransporte } from '../aplicacion/puertos/fabrica-de-transporte.js';
import type { TransporteDeCorreo } from '../aplicacion/transporte-de-correo.js';
import { TransporteNodemailer } from './transporte-nodemailer.js';

/** Crea un transporte SMTP de nodemailer por conexión. */
export class FabricaDeTransporteNodemailer implements FabricaDeTransporte {
  crear(conexion: ConexionAlServidor): TransporteDeCorreo {
    return new TransporteNodemailer(conexion);
  }
}
