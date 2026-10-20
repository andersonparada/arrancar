import { DatoInvalido, ReglaDeNegocioInfringida } from '../../../core/compartido/dominio/errores.js';

/** El número de la constancia: de 1 a 40 caracteres sin espacios. */
export class NumeroDeConstanciaInvalido extends DatoInvalido {
  readonly codigo = 'numero_de_constancia_invalido';

  constructor() {
    super('Escriba el número de la constancia (hasta 40 caracteres, sin espacios).', { campo: 'numero' });
  }
}

export class FechaDeConstanciaInvalida extends DatoInvalido {
  readonly codigo = 'fecha_de_constancia_invalida';

  constructor() {
    super('Escriba la fecha de la constancia como AAAA-MM-DD.', { campo: 'fecha' });
  }
}

/** La constancia se emite después de retener: su fecha no puede ser anterior a la de la retención. */
export class ConstanciaAnteriorALaRetencion extends DatoInvalido {
  readonly codigo = 'constancia_anterior_a_la_retencion';

  constructor(fechaDeLaRetencion: string) {
    super(`La fecha de la constancia no puede ser anterior a la retención (${fechaDeLaRetencion}).`, {
      campo: 'fecha',
    });
  }
}

export class MotivoDeLaConstanciaInvalido extends DatoInvalido {
  readonly codigo = 'motivo_de_la_constancia_invalido';

  constructor() {
    super('Explique por qué quita la constancia (hasta 300 caracteres).', { campo: 'motivo' });
  }
}

/** Una retención que el usuario dejó en cero no se retuvo: no hay nada que enterar ni constancia que anotar. */
export class RetencionEnCero extends ReglaDeNegocioInfringida {
  readonly codigo = 'retencion_en_cero';

  constructor() {
    super('La retención está en cero: no se retuvo nada.');
  }
}

export class RetencionSinConstancia extends ReglaDeNegocioInfringida {
  readonly codigo = 'retencion_sin_constancia';

  constructor() {
    super('La retención no tiene constancia anotada.');
  }
}

/** Un lote con filas inválidas se rechaza completo; `detalles.filas` dice cuál falló y en qué campo. */
export class ConstanciasEnLoteInvalidas extends DatoInvalido {
  readonly codigo = 'constancias_en_lote_invalidas';

  constructor(filas: ReadonlyArray<{ indice: number; campo: string; mensaje: string }>) {
    super('Hay constancias con problemas: no se guardó ninguna.', { filas });
  }
}

export class ResolucionInvalida extends DatoInvalido {
  readonly codigo = 'resolucion_invalida';

  constructor() {
    super('Escoja una resolución: pendiente, constancia anulada, rectificada o no requiere.', { campo: 'resolucion' });
  }
}

export class NotaDeResolucionInvalida extends DatoInvalido {
  readonly codigo = 'nota_de_resolucion_invalida';

  constructor() {
    super('Explique cómo se resolvió (hasta 300 caracteres).', { campo: 'nota' });
  }
}

export class ResolucionSoloDeDocumentoAnulado extends ReglaDeNegocioInfringida {
  readonly codigo = 'resolucion_solo_de_documento_anulado';

  constructor() {
    super('Solo se resuelven las retenciones de documentos anulados.');
  }
}

/** Con constancia la retención ya se reportó a la SAT: el documento se anula, no se borra. */
export class DocumentoConConstancia extends ReglaDeNegocioInfringida {
  readonly codigo = 'documento_con_constancia';

  constructor() {
    super('El documento tiene retenciones con constancia: no se puede eliminar, anúlelo.');
  }
}

/** Con el mes y grupo ya enterado el rastro debe quedar: el documento se anula y se rectifica el entero. */
export class DocumentoConRetencionEnterada extends ReglaDeNegocioInfringida {
  readonly codigo = 'documento_con_retencion_enterada';

  constructor() {
    super('Una retención del documento ya se enteró en su mes: no se puede eliminar, anúlelo.');
  }
}

export class SinRetencionesQueEnterar extends ReglaDeNegocioInfringida {
  readonly codigo = 'sin_retenciones_que_enterar';

  constructor() {
    super('Ese mes y grupo no tienen retenciones que enterar.');
  }
}

export class DocumentoDePagoInvalido extends DatoInvalido {
  readonly codigo = 'documento_de_pago_invalido';

  constructor() {
    super('Escriba el número del formulario o la boleta de pago (hasta 40 caracteres, sin espacios).', {
      campo: 'documentoDePago',
    });
  }
}

export class MontoDelEnteroInvalido extends DatoInvalido {
  readonly codigo = 'monto_del_entero_invalido';

  constructor() {
    super('El monto pagado debe ser mayor que cero.', { campo: 'monto' });
  }
}

export class FechaDePagoInvalida extends DatoInvalido {
  readonly codigo = 'fecha_de_pago_invalida';

  constructor() {
    super('La fecha de pago no puede ser anterior al mes de las retenciones.', { campo: 'fechaDePago' });
  }
}

export class MesDelEnteroInvalido extends DatoInvalido {
  readonly codigo = 'mes_del_entero_invalido';

  constructor() {
    super('Escoja el mes de las retenciones.', { campo: 'mes' });
  }
}

export class GrupoDeEnteroInvalido extends DatoInvalido {
  readonly codigo = 'grupo_de_entero_invalido';

  constructor() {
    super('Escoja el grupo: IVA de agentes, ISR opcional, IVA de facturas especiales o ISR de facturas especiales.', {
      campo: 'grupo',
    });
  }
}

export class ObservacionesDelEnteroInvalidas extends DatoInvalido {
  readonly codigo = 'observaciones_del_entero_invalidas';

  constructor() {
    super('Las observaciones llevan hasta 300 caracteres.', { campo: 'observaciones' });
  }
}

export class EnteroYaAnulado extends ReglaDeNegocioInfringida {
  readonly codigo = 'entero_ya_anulado';

  constructor() {
    super('El entero ya está anulado.');
  }
}

export class MotivoDeAnulacionDelEnteroInvalido extends DatoInvalido {
  readonly codigo = 'motivo_de_anulacion_del_entero_invalido';

  constructor() {
    super('Escriba el motivo de la anulación (hasta 300 caracteres).', { campo: 'motivo' });
  }
}
