import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';

/** Anular un documento exige decir por qué (máximo 300 letras, como la columna de la base). */
export class MotivoDeAnulacionInvalido extends DatoInvalido {
  readonly codigo = 'motivo_de_anulacion_invalido';

  constructor() {
    super('Escriba el motivo de la anulación (hasta 300 caracteres).');
  }
}

/** La causa de anulación no es una de la lista (error de captura, FEL anulada por el emisor, no corresponde a la empresa). */
export class CausaDeAnulacionInvalida extends DatoInvalido {
  readonly codigo = 'causa_de_anulacion_invalida';

  constructor() {
    super(
      'Escoja la causa de la anulación: error de captura, FEL anulada por el emisor o no corresponde a la empresa.',
    );
  }
}

/** El documento ya está anulado: no se vuelve a anular, ni se elimina, ni se marca como procesado. */
export class DocumentoYaAnulado extends ReglaDeNegocioInfringida {
  readonly codigo = 'documento_ya_anulado';

  constructor() {
    super('El documento ya está anulado.');
  }
}

/** Una factura con notas de crédito vigentes no se anula: primero se anulan sus notas. */
export class DocumentoConNotasVigentes extends ReglaDeNegocioInfringida {
  readonly codigo = 'documento_con_notas_vigentes';

  constructor() {
    super('La factura tiene notas de crédito vigentes: anúlelas primero.');
  }
}

/** El destino ya procesó el documento: no se elimina (se anula, y el destino revierte lo suyo). */
export class DocumentoProcesadoEnElDestino extends ReglaDeNegocioInfringida {
  readonly codigo = 'documento_procesado_en_el_destino';

  constructor() {
    super('El destino ya procesó el documento: no se puede eliminar, anúlelo.');
  }
}

/** Una factura con notas de crédito (aunque estén anuladas) no se elimina: las notas apuntan a ella. */
export class DocumentoConNotas extends ReglaDeNegocioInfringida {
  readonly codigo = 'documento_con_notas';

  constructor() {
    super('La factura tiene notas de crédito registradas: no se puede eliminar.');
  }
}
