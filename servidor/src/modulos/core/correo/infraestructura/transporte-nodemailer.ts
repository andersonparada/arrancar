import { createTransport, type Transporter } from 'nodemailer';
import type { MensajeDeSalida, RespuestaDeEnvio, TransporteDeCorreo } from '../aplicacion/transporte-de-correo.js';
import {
  clasificarError,
  opcionesDeMensaje,
  opcionesDeTransporte,
  type ConfiguracionDelServidor,
} from './opciones-de-nodemailer.js';

interface InformacionDeEnvio {
  rejected?: unknown[];
}

function direccionesRechazadas(informacion: InformacionDeEnvio): string[] {
  return (informacion.rejected ?? []).map((rechazada) =>
    typeof rechazada === 'string' ? rechazada : String((rechazada as { address?: unknown }).address ?? ''),
  );
}

/**
 * Envía por SMTP con nodemailer. Un solo transporte por proceso con conexiones agrupadas; cuando Soporte
 * cambie el servidor se cierra este y se crea otro. No registra el mensaje ni el texto del servidor.
 */
export class TransporteNodemailer implements TransporteDeCorreo {
  /** Con `transporte` se inyecta uno ya armado (pruebas); si no, se crea el SMTP de `configuracion`. */
  constructor(
    configuracion: ConfiguracionDelServidor,
    private readonly transporte: Pick<Transporter, 'sendMail' | 'close'> = createTransport(
      opcionesDeTransporte(configuracion),
    ),
  ) {}

  async enviar(mensaje: MensajeDeSalida): Promise<RespuestaDeEnvio> {
    const inicio = Date.now();
    try {
      const informacion = (await this.transporte.sendMail(opcionesDeMensaje(mensaje))) as InformacionDeEnvio;
      const rechazados = direccionesRechazadas(informacion);
      return { resultado: 'enviado', codigo: null, rechazados, duracionMs: Date.now() - inicio };
    } catch (error) {
      return clasificarError(error, Date.now() - inicio);
    }
  }

  async cerrar(): Promise<void> {
    this.transporte.close();
  }
}
