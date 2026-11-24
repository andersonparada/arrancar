import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';

/** Desligar un posfechado de apertura solo se hace desde un pago vigente de esa forma. */
export class PagoNoEsChequeDeApertura extends ReglaDeNegocioInfringida {
  readonly codigo = 'pago_no_es_cheque_de_apertura';

  constructor(numero: string) {
    super(`El pago ${numero} no se hizo con un cheque de apertura: no hay nada que desligar.`);
  }
}

/** El cheque que una cuenta de apertura dice que ya pagó lo mismo debe ser uno en circulación de la carga inicial. */
export class ChequeDeAperturaReferidoInvalido extends DatoInvalido {
  readonly codigo = 'cheque_de_apertura_referido_invalido';

  constructor() {
    super('Escoja un cheque en circulación de la carga inicial que siga vigente.', {
      campo: 'chequeDeAperturaReferidoId',
    });
  }
}
