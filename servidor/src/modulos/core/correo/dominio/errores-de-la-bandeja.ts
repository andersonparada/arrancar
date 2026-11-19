import { DatoInvalido, DemasiadasSolicitudes } from '../../compartido/dominio/errores.js';

export type LimiteDeCorreos = 'hora' | 'dia' | 'destinatario' | 'instalacion';

const MENSAJE_DEL_LIMITE: Record<LimiteDeCorreos, string> = {
  hora: 'Ya se enviaron demasiados correos en la última hora. Inténtelo de nuevo en un rato.',
  dia: 'Ya se enviaron demasiados correos hoy. Inténtelo de nuevo mañana.',
  destinatario: 'Esa dirección ya recibió demasiados correos hoy. Inténtelo de nuevo mañana.',
  instalacion: 'El servicio de correo está saturado en este momento. Inténtelo de nuevo en unos minutos.',
};

/** Se pasó un tope de correos (C5): por cuenta, por destinatario o de toda la instalación (HTTP 429). */
export class CupoDeCorreosAgotado extends DemasiadasSolicitudes {
  readonly codigo = 'cupo_de_correos_agotado';

  constructor(readonly limite: LimiteDeCorreos) {
    super(MENSAJE_DEL_LIMITE[limite], { limite });
  }
}

/** Un correo sale a una o más personas, pero no a más de diez. */
export class DemasiadosDestinatarios extends DatoInvalido {
  readonly codigo = 'demasiados_destinatarios';

  constructor(maximo: number) {
    super(`Un correo no puede ir a más de ${maximo} destinatarios.`, { maximo });
  }
}

/** Falta a quién mandarle el correo. */
export class SinDestinatarios extends DatoInvalido {
  readonly codigo = 'sin_destinatarios';

  constructor() {
    super('El correo necesita al menos un destinatario.');
  }
}

/** El adjunto no es un PDF generado por la aplicación, o es demasiado grande (C8). */
export class AdjuntoNoValido extends DatoInvalido {
  readonly codigo = 'adjunto_no_valido';

  constructor(motivo: string) {
    super(`El adjunto no es válido: ${motivo}`);
  }
}

/** El asunto o el mensaje quedó vacío o demasiado largo después de armarlo. */
export class ContenidoDeCorreoNoValido extends DatoInvalido {
  readonly codigo = 'contenido_de_correo_no_valido';

  constructor(motivo: string) {
    super(`El correo no se puede armar: ${motivo}`);
  }
}
