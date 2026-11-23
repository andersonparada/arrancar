import { ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';

/** Solo un posfechado de la carga inicial, vigente y sin origen, se liga a un pago de otro módulo. */
export class ChequeDeAperturaNoLigable extends ReglaDeNegocioInfringida {
  readonly codigo = 'cheque_de_apertura_no_ligable';

  constructor() {
    super(
      'Solo se liga un cheque posfechado de la carga inicial que esté vigente (sin anular ni revertir) y que no tenga ya otro origen.',
    );
  }
}

/** El pago ligado es de un solo cheque: su monto debe ser exactamente el del cheque. */
export class MontoDistintoDelCheque extends ReglaDeNegocioInfringida {
  readonly codigo = 'monto_distinto_del_cheque';

  constructor(montoDelCheque: string, montoDelPago: string) {
    super(`El cheque es de Q${montoDelCheque} y el pago es de Q${montoDelPago}: deben ser iguales.`);
  }
}
