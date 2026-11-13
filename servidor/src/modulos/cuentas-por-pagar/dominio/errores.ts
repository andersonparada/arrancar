import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';

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

/** El documento ya se autorizó (se aprobó para pago): no se elimina, se anula. */
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

/** Un cargo que recibió saldo a favor por una aplicación manual no se da de baja: primero se quita la aplicación. */
export class CargoConAplicacionesManuales extends ReglaDeNegocioInfringida {
  readonly codigo = 'cargo_con_aplicaciones_manuales';

  constructor(cargo: string, notas: readonly string[]) {
    const quienes =
      notas.length === 1 ? `la nota ${notas[0]}` : `las notas ${notas.slice(0, -1).join(', ')} y ${notas.at(-1)}`;
    super(`El documento ${cargo} recibió saldo a favor de ${quienes}: quite primero la aplicación de ${quienes}.`);
  }
}

/** Una nota con ajustes vigentes no se anula ni se elimina: primero se anulan sus ajustes. */
export class NotaConAjustes extends ReglaDeNegocioInfringida {
  readonly codigo = 'nota_con_ajustes';

  constructor(nota: string) {
    super(`La nota ${nota} tiene ajustes de saldo vigentes: anule primero el ajuste.`);
  }
}

/** Completar solo vale para lo que está pendiente en la bandeja. */
export class DocumentoNoPendiente extends ReglaDeNegocioInfringida {
  readonly codigo = 'documento_no_pendiente';

  constructor(etiqueta: string) {
    super(`El documento ${etiqueta} ya no está pendiente en la bandeja.`);
  }
}

/** Autorizar solo vale para lo que ya se completó. */
export class DocumentoNoRegistrado extends ReglaDeNegocioInfringida {
  readonly codigo = 'documento_no_registrado';

  constructor(etiqueta: string) {
    super(`El documento ${etiqueta} no está completado: complételo en la bandeja antes de autorizarlo.`);
  }
}

/** Autorizar dos veces (otra pestaña, otro usuario): se dice que ya está autorizado, no que falta completarlo. */
export class DocumentoYaAutorizado extends ReglaDeNegocioInfringida {
  readonly codigo = 'documento_ya_autorizado';

  constructor(etiqueta: string) {
    super(`El documento ${etiqueta} ya está autorizado.`);
  }
}

/** Desautorizar solo vale para lo que está autorizado. */
export class DocumentoNoAutorizado extends ReglaDeNegocioInfringida {
  readonly codigo = 'documento_no_autorizado';

  constructor(etiqueta: string) {
    super(`El documento ${etiqueta} no está autorizado.`);
  }
}

/** El vencimiento se cambia en un cargo completado o autorizado; una nota de crédito no vence. */
export class VencimientoNoEditable extends ReglaDeNegocioInfringida {
  readonly codigo = 'vencimiento_no_editable';

  constructor(etiqueta: string) {
    super(`El vencimiento del documento ${etiqueta} no se puede cambiar.`);
  }
}

/** El vencimiento que llegó contradice al documento: una nota de crédito no vence, y ningún cargo vence antes de emitirse. */
export class VencimientoInvalido extends DatoInvalido {
  readonly codigo = 'vencimiento_invalido';

  constructor(mensaje: string) {
    super(mensaje, { campo: 'vencimiento' });
  }
}

/** El motivo de una anulación o de una desautorización es obligatorio y de hasta 300 caracteres. */
export class MotivoInvalido extends DatoInvalido {
  readonly codigo = 'motivo_invalido';

  constructor() {
    super('Escriba el motivo (hasta 300 caracteres).');
  }
}

/** Un documento anulado ya no se anula otra vez. */
export class DocumentoYaAnulado extends ReglaDeNegocioInfringida {
  readonly codigo = 'documento_ya_anulado';

  constructor(etiqueta: string) {
    super(`El documento ${etiqueta} ya está anulado.`);
  }
}

/** Para anular una factura primero se anulan las notas que la corrigen. */
export class DocumentoConNotasVigentes extends ReglaDeNegocioInfringida {
  readonly codigo = 'documento_con_notas_vigentes';

  constructor(etiqueta: string) {
    super(`El documento ${etiqueta} tiene notas de crédito o de débito vigentes: anúlelas primero.`);
  }
}

/** Un documento anulado se queda como rastro: no se elimina. */
export class DocumentoNoEliminable extends ReglaDeNegocioInfringida {
  readonly codigo = 'documento_no_eliminable';

  constructor(etiqueta: string) {
    super(`El documento ${etiqueta} está anulado: se queda como rastro y no se elimina.`);
  }
}

/** Las notas, aun anuladas, se quedan como rastro de su factura: la factura no se elimina. */
export class DocumentoConNotas extends ReglaDeNegocioInfringida {
  readonly codigo = 'documento_con_notas';

  constructor(etiqueta: string) {
    super(`El documento ${etiqueta} tiene notas de crédito o de débito (aunque estén anuladas): no se puede eliminar.`);
  }
}

/** Un saldo inicial no es un registro fiscal: no se anula ni se elimina por Documentos. */
export class EsUnSaldoInicial extends ReglaDeNegocioInfringida {
  readonly codigo = 'es_un_saldo_inicial';

  constructor(etiqueta: string) {
    super(
      `El documento ${etiqueta} es un saldo inicial: no se anula; corríjalo o elimínelo en Administración → Saldos iniciales mientras la carga inicial esté abierta.`,
    );
  }
}
