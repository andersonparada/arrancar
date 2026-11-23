import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';

/** La boleta no existe en la empresa o ya está anulada: no admite un escaneo firmado nuevo. */
export class BoletaInexistente extends RecursoNoEncontrado {
  override readonly codigo = 'boleta_inexistente';

  constructor() {
    super('La boleta de traslado vigente');
  }
}

/** La boleta todavía no tiene su escaneo firmado. */
export class BoletaSinFirmada extends RecursoNoEncontrado {
  override readonly codigo = 'boleta_sin_firmada';

  constructor() {
    super('El escaneo firmado de la boleta');
  }
}
