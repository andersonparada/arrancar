import { ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';

/**
 * El documento ya estaba en Cuentas por pagar. Libro de compras manda la orden una sola vez por registro, así que esto
 * es un error de programación y no se ignora en silencio.
 */
export class DocumentoYaRecibido extends ReglaDeNegocioInfringida {
  readonly codigo = 'documento_ya_recibido';

  constructor() {
    super('Ese documento ya está en Cuentas por pagar.');
  }
}
