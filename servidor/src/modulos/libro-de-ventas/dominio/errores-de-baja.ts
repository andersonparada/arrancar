import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';

/** Anular un documento exige decir por qué (máximo 300 letras, como la columna de la base). */
export class MotivoDeAnulacionInvalido extends DatoInvalido {
  readonly codigo = 'motivo_de_anulacion_invalido';

  constructor() {
    super('Escriba el motivo de la anulación (hasta 300 caracteres).');
  }
}

export class CausaDeAnulacionInvalida extends DatoInvalido {
  readonly codigo = 'causa_de_anulacion_invalida';

  constructor() {
    super('Escoja la causa de la anulación: FEL anulada en la SAT, error de captura o no corresponde a la empresa.');
  }
}

/** Si la FEL se anuló en la SAT, hay que escribir la fecha en que ocurrió: no se presume. */
export class FechaDeAnulacionRequerida extends DatoInvalido {
  readonly codigo = 'fecha_de_anulacion_requerida';

  constructor() {
    super('Escriba la fecha en que la SAT anuló la FEL.');
  }
}

/** La fecha de anulación no puede ser anterior a la emisión ni futura. */
export class FechaDeAnulacionInvalida extends DatoInvalido {
  readonly codigo = 'fecha_de_anulacion_invalida';

  constructor() {
    super('La fecha de anulación no puede ser anterior a la emisión ni posterior a hoy.');
  }
}

export class DocumentoYaAnulado extends ReglaDeNegocioInfringida {
  readonly codigo = 'documento_ya_anulado';

  constructor() {
    super('El documento ya está anulado.');
  }
}

/** Una factura con notas vigentes no se anula: primero se anulan sus notas. */
export class DocumentoConNotasVigentes extends ReglaDeNegocioInfringida {
  readonly codigo = 'documento_con_notas_vigentes';

  constructor() {
    super('La factura tiene notas vigentes: anúlelas primero.');
  }
}

/** Una factura con notas (aunque estén anuladas) no se elimina: las notas apuntan a ella. */
export class DocumentoConNotas extends ReglaDeNegocioInfringida {
  readonly codigo = 'documento_con_notas';

  constructor() {
    super('La factura tiene notas registradas: no se puede eliminar.');
  }
}

/** La cartera ya procesó el documento: no se elimina (se anula, y la cartera revierte lo suyo). */
export class DocumentoProcesado extends ReglaDeNegocioInfringida {
  readonly codigo = 'documento_procesado';

  constructor() {
    super('La cartera ya procesó el documento: no se puede eliminar, anúlelo.');
  }
}

/** Anular una nota de débito dejaría a las notas de crédito de su factura rebajando más de lo que vale. */
export class NotaDeDebitoSostieneNotasDeCredito extends ReglaDeNegocioInfringida {
  readonly codigo = 'nota_de_debito_sostiene_notas_de_credito';

  constructor() {
    super('Las notas de crédito de la factura dejarían de caber sin esta nota de débito: anúlelas primero.');
  }
}

/** El documento va a un módulo que no está activo en la cuenta. */
export class DestinoInactivo extends ReglaDeNegocioInfringida {
  readonly codigo = 'destino_inactivo';

  constructor(destino: string) {
    super(`El módulo ${destino} no está activo: no se puede registrar ni dar de baja un documento que va a él.`);
  }
}

/** Un destino pedido no se puede (sin cliente, o un tipo que no es cartera). */
export class DestinoNoAdmitido extends DatoInvalido {
  readonly codigo = 'destino_no_admitido';

  constructor(mensaje: string) {
    super(mensaje);
  }
}
