import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';

/** La línea no existe, su documento está anulado, no está marcada como inventario o no es de una nota que se pueda aplicar. */
export class LineaNoRecibible extends ReglaDeNegocioInfringida {
  readonly codigo = 'linea_no_recibible';

  constructor(motivo = 'La línea no existe en el Libro de compras de la empresa o no se puede recibir.') {
    super(motivo);
  }
}

/** La línea se apartó de la bandeja (era gasto): se devuelve a ella antes de recibirla. */
export class LineaDescartada extends ReglaDeNegocioInfringida {
  readonly codigo = 'linea_descartada';

  constructor() {
    super('La línea está descartada de la bandeja: devuélvala a la bandeja antes de recibirla.');
  }
}

/** Lo recibido de la línea (o lo que una nota le aplica) pasaría de su costo. */
export class LineaSobrerrecibida extends ReglaDeNegocioInfringida {
  readonly codigo = 'linea_sobrerrecibida';

  constructor(pendienteCentavos: bigint) {
    super('El monto pasa de lo que falta de la línea.', { pendienteCentavos: pendienteCentavos.toString() });
  }
}

/** Una línea con recepciones, devoluciones o rebajas vigentes no se descarta: se anulan antes. */
export class LineaConRecepciones extends ReglaDeNegocioInfringida {
  readonly codigo = 'linea_con_recepciones';

  constructor() {
    super('La línea tiene recepciones, devoluciones o rebajas vigentes: anúlelas antes de descartarla.');
  }
}

/** La línea no está descartada. */
export class DescarteNoVigente extends ReglaDeNegocioInfringida {
  readonly codigo = 'descarte_no_vigente';

  constructor() {
    super('La línea no está descartada.');
  }
}

/** El motivo del descarte no cumple: obligatorio, hasta 300 caracteres. */
export class MotivoDeDescarteInvalido extends DatoInvalido {
  readonly codigo = 'motivo_de_descarte_invalido';

  constructor() {
    super('Escriba el motivo del descarte (hasta 300 caracteres).');
  }
}

/** Quien llama al libro (anular o eliminar un documento) se topa con documentos de Inventarios vigentes. */
export class DocumentoConRecepciones extends ReglaDeNegocioInfringida {
  readonly codigo = 'documento_con_recepciones';

  constructor(numeros: readonly string[]) {
    super(`El documento tiene movimientos de Inventarios vigentes (${numeros.join(', ')}): anúlelos primero.`, {
      documentos: [...numeros],
    });
  }
}

/** Una devolución pide más de lo que queda de la entrada que devuelve. */
export class DevolucionMayorQueLaEntrada extends ReglaDeNegocioInfringida {
  readonly codigo = 'devolucion_mayor_que_la_entrada';

  constructor(disponible: string) {
    super(`La devolución pasa de lo que queda por devolver de esa entrada (${disponible}).`, { disponible });
  }
}

/** La devolución lleva una fecha anterior a la de la entrada que devuelve. */
export class DevolucionAntesDeLaEntrada extends ReglaDeNegocioInfringida {
  readonly codigo = 'devolucion_antes_de_la_entrada';

  constructor() {
    super('La fecha de la devolución no puede ser anterior a la de las entradas que devuelve.');
  }
}

/** La nota de crédito, las entradas o la bodega de una devolución o rebaja no son coherentes entre sí. */
export class NotaNoCorrespondeALasEntradas extends ReglaDeNegocioInfringida {
  readonly codigo = 'nota_no_corresponde_a_las_entradas';

  constructor(motivo: string) {
    super(motivo);
  }
}

/** Una recepción con devoluciones o rebajas vigentes no se anula: primero se anulan ellas. */
export class RecepcionConDocumentosPosteriores extends ReglaDeNegocioInfringida {
  readonly codigo = 'recepcion_con_documentos_posteriores';

  constructor(numeros: readonly string[]) {
    super(`Tiene devoluciones o rebajas vigentes (${numeros.join(', ')}): anúlelas primero.`, {
      documentos: [...numeros],
    });
  }
}
