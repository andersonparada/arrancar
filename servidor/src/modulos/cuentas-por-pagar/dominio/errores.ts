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

/** El documento ya se autorizó (se provisionó): no se elimina, se anula. */
export class DocumentoAutorizado extends ReglaDeNegocioInfringida {
  readonly codigo = 'documento_autorizado';

  constructor() {
    super('El documento ya está autorizado: no se puede eliminar, anúlelo.');
  }
}

/** Un cargo con notas de crédito aplicadas no se da de baja: primero se anulan sus notas. */
export class CargoConNotasAplicadas extends ReglaDeNegocioInfringida {
  readonly codigo = 'cargo_con_notas_aplicadas';

  constructor() {
    super('El documento tiene notas de crédito aplicadas: anúlelas primero.');
  }
}
