import { RecursoEnUso } from '../../compartido/aplicacion/errores.js';
import { DatoInvalido } from '../../compartido/dominio/errores.js';

const MAXIMO_DEL_MOTIVO = 300;

/** Solo se cancela un correo que aún no sale: uno que ya se está enviando o se envió no se detiene (HTTP 409). */
export class CorreoNoPendiente extends RecursoEnUso {
  override readonly codigo = 'correo_no_pendiente';

  constructor() {
    super('Solo se puede cancelar un correo pendiente; este ya se está enviando, se envió o se canceló.');
  }
}

/** Solo se reintenta un correo que falló (HTTP 409). */
export class CorreoNoReintentable extends RecursoEnUso {
  override readonly codigo = 'correo_no_reintentable';

  constructor() {
    super('Solo se puede reintentar un correo que falló.');
  }
}

/** El contenido del correo ya se depuró (se conserva 30 días): no hay qué volver a mandar (HTTP 409). */
export class CorreoSinContenido extends RecursoEnUso {
  override readonly codigo = 'correo_sin_contenido';

  constructor() {
    super('El contenido de este correo ya se depuró y no se puede reintentar. Envíe uno nuevo desde su origen.');
  }
}

export class MotivoDeCancelacionNoValido extends DatoInvalido {
  readonly codigo = 'motivo_de_cancelacion_no_valido';

  constructor() {
    super(`Escriba el motivo de la cancelación (hasta ${MAXIMO_DEL_MOTIVO} caracteres).`);
  }
}

/** El motivo de una cancelación: de 1 a 300 caracteres, sin espacios de sobra. */
export function validarMotivoDeCancelacion(motivo: string): string {
  const limpio = motivo.trim();
  if (limpio.length < 1 || limpio.length > MAXIMO_DEL_MOTIVO) throw new MotivoDeCancelacionNoValido();
  return limpio;
}
