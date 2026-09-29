import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';

/** Los conceptos que el sistema usa por su cuenta no se editan, inactivan ni eliminan. */
export class ConceptoDeSistema extends ReglaDeNegocioInfringida {
  readonly codigo = 'concepto_de_sistema';

  constructor() {
    super('Es un concepto que usa el sistema: no se puede editar, inactivar ni eliminar.');
  }
}

/** Un concepto que ya clasifica notas o cheques no se elimina: se inactiva. */
export class ConceptoEnUso extends ReglaDeNegocioInfringida {
  readonly codigo = 'concepto_en_uso';

  constructor() {
    super('El concepto ya clasifica notas o cheques: no se puede eliminar, pero sí inactivar.');
  }
}

/** Los conceptos de sistema (incluido «Sin clasificar») los asigna el sistema: nunca se eligen al capturar. */
export class ConceptoDeSistemaNoSeElige extends ReglaDeNegocioInfringida {
  readonly codigo = 'concepto_de_sistema_no_se_elige';

  constructor() {
    super('Ese concepto lo asigna el sistema por su cuenta: elija uno de los conceptos de la empresa.');
  }
}

/** Un concepto inactivo no se elige para clasificar nada nuevo. */
export class ConceptoInactivo extends ReglaDeNegocioInfringida {
  readonly codigo = 'concepto_inactivo';

  constructor() {
    super('El concepto está inactivo: elija otro o reactívelo primero.');
  }
}

/** El concepto solo sirve para créditos o solo para débitos y el movimiento es del otro tipo. */
export class ConceptoIncompatible extends ReglaDeNegocioInfringida {
  readonly codigo = 'concepto_incompatible';

  constructor(aplicaA: 'credito' | 'debito') {
    super(
      aplicaA === 'credito'
        ? 'Ese concepto es solo para entradas de dinero (notas de crédito): elija uno para salidas.'
        : 'Ese concepto es solo para salidas de dinero (notas de débito y cheques): elija uno para entradas.',
    );
  }
}

/** Toda nota y todo cheque llevan concepto. */
export class ConceptoObligatorio extends DatoInvalido {
  readonly codigo = 'concepto_obligatorio';

  constructor() {
    super('Elija el concepto del movimiento.');
  }
}

/** Un inverso se clasifica con su original: se reclasifica el original y el inverso lo sigue. */
export class NoSeReclasificaUnInverso extends ReglaDeNegocioInfringida {
  readonly codigo = 'no_se_reclasifica_un_inverso';

  constructor() {
    super('Un movimiento inverso hereda el concepto de su original: reclasifique el original.');
  }
}

/** Las notas de una transferencia siempre llevan el concepto «Transferencia entre cuentas». */
export class NoSeReclasificaUnaTransferencia extends ReglaDeNegocioInfringida {
  readonly codigo = 'no_se_reclasifica_una_transferencia';

  constructor() {
    super('Las notas de una transferencia llevan siempre el concepto de transferencia.');
  }
}

/** El saldo inicial siempre lleva el concepto «Saldo inicial». */
export class NoSeReclasificaElSaldoInicial extends ReglaDeNegocioInfringida {
  readonly codigo = 'no_se_reclasifica_el_saldo_inicial';

  constructor() {
    super('El saldo inicial lleva siempre su propio concepto.');
  }
}

/** Lo que generó otro módulo lleva el concepto que ese módulo fijó: se corrige allá (informe del contador, C4). */
export class NoSeReclasificaLoDeOtroModulo extends ReglaDeNegocioInfringida {
  readonly codigo = 'no_se_reclasifica_lo_de_otro_modulo';

  constructor() {
    super('Este movimiento lo generó otro módulo, que fijó su concepto: corríjalo allá.');
  }
}

/** Tope de movimientos por reclasificación: todo o nada, así que no conviene una transacción enorme. */
export const MAXIMO_DE_MOVIMIENTOS_A_RECLASIFICAR = 200;

export class CantidadInvalidaParaReclasificar extends DatoInvalido {
  readonly codigo = 'cantidad_invalida_para_reclasificar';

  constructor() {
    super(`Elija entre 1 y ${MAXIMO_DE_MOVIMIENTOS_A_RECLASIFICAR} movimientos para clasificar a la vez.`);
  }
}

/** Con Cuentas por pagar activo, «Pago a proveedores» lo fija ese módulo al pagar: no se elige en un cheque manual (P3). */
export class PagoAProveedoresLoFijaCuentasPorPagar extends ReglaDeNegocioInfringida {
  readonly codigo = 'pago_a_proveedores_lo_fija_cuentas_por_pagar';

  constructor() {
    super('«Pago a proveedores» lo asigna Cuentas por pagar al pagar una contraseña: elija otro concepto.');
  }
}
