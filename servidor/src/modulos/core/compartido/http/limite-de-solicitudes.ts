import { DemasiadasSolicitudes } from '../dominio/errores.js';

/** Se superó el límite de solicitudes de una ruta (HTTP 429), con el formato de error de la API. */
export class DemasiadosIntentos extends DemasiadasSolicitudes {
  readonly codigo = 'demasiadas_solicitudes';

  constructor() {
    super('Hizo demasiados intentos en poco tiempo. Espere un momento e inténtelo de nuevo.');
  }
}

/** Respuesta por omisión del limitador: en español y como `{ error: { codigo, mensaje } }`. */
export const respuestaDeLimiteExcedido = (): DemasiadosIntentos => new DemasiadosIntentos();
