import { ErrorEsperado } from '../../compartido/dominio/errores.js';

/** El servicio del Banco de Guatemala no respondió a tiempo, respondió con error o no se pudo leer. Vale reintentar. */
export class FuenteNoDisponible extends ErrorEsperado {
  readonly codigo = 'FUENTE_DE_TIPOS_DE_CAMBIO_NO_DISPONIBLE';
}

/** La respuesta llegó, pero no es la esperada (XML con entidades, demasiado grande, sin la estructura del servicio). No se reintenta. */
export class RespuestaInvalida extends ErrorEsperado {
  readonly codigo = 'RESPUESTA_DE_TIPOS_DE_CAMBIO_INVALIDA';
}
