import { DemasiadasSolicitudes } from '../../compartido/dominio/errores.js';

/** Soporte pidió más pruebas de envío de las permitidas por hora. */
export class DemasiadasPruebasDeCorreo extends DemasiadasSolicitudes {
  readonly codigo = 'demasiadas_pruebas_de_correo';

  constructor() {
    super(
      'Ya se hicieron demasiadas pruebas de correo en la última hora. Espere un rato antes de intentarlo de nuevo.',
    );
  }
}
