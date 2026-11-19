import type { MensajeDeSalida, RespuestaDeEnvio, TransporteDeCorreo } from '../aplicacion/transporte-de-correo.js';

const RESPUESTA_EXITOSA: RespuestaDeEnvio = { resultado: 'enviado', codigo: null, rechazados: [], duracionMs: 0 };

/** Doble de pruebas: guarda lo que se «envía» y responde lo que se le programe (por omisión, éxito). */
export class TransporteEnMemoria implements TransporteDeCorreo {
  readonly enviados: MensajeDeSalida[] = [];
  cerrado = false;
  private respuestas: RespuestaDeEnvio[] = [];

  /** La próxima llamada a `enviar` responde esto (en orden; después vuelve al éxito). */
  programarRespuesta(respuesta: Partial<RespuestaDeEnvio> & Pick<RespuestaDeEnvio, 'resultado'>): void {
    this.respuestas.push({ codigo: null, rechazados: [], duracionMs: 0, ...respuesta });
  }

  async enviar(mensaje: MensajeDeSalida): Promise<RespuestaDeEnvio> {
    const respuesta = this.respuestas.shift() ?? RESPUESTA_EXITOSA;
    if (respuesta.resultado === 'enviado') this.enviados.push(mensaje);
    return respuesta;
  }

  async cerrar(): Promise<void> {
    this.cerrado = true;
  }
}
