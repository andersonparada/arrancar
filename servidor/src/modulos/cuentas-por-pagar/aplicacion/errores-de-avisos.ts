import { RecursoEnUso } from '../../core/compartido/aplicacion/errores.js';
import { DatoInvalido, DemasiadasSolicitudes } from '../../core/compartido/dominio/errores.js';

/** El pago no admite aviso (anulado, de la cuenta de apertura) o el destinatario no es del proveedor (HTTP 409). */
export class AvisoNoDisponible extends RecursoEnUso {
  override readonly codigo = 'aviso_no_disponible';
}

/** El destinatario escogido tiene un correo que no pasa la regla de envío (HTTP 400). */
export class DireccionDelAvisoNoUtilizable extends DatoInvalido {
  readonly codigo = 'direccion_no_utilizable';

  constructor(nombre: string) {
    super(`El correo de ${nombre} no se puede usar para enviar: corríjalo en el proveedor.`);
  }
}

/** Más avisos de pago por minuto de los permitidos a un mismo usuario (HTTP 429). */
export class DemasiadosAvisosDePago extends DemasiadasSolicitudes {
  readonly codigo = 'demasiados_avisos_de_pago';

  constructor() {
    super('Está enviando avisos muy rápido. Espere un momento antes de enviar otro.');
  }
}
