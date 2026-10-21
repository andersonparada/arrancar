import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';

/** La fila de la bandeja ya no está pendiente (se registró, se descartó o está bloqueada): no se puede completar ni confirmar. */
export class DteNoEstaPendiente extends ReglaDeNegocioInfringida {
  readonly codigo = 'dte_no_esta_pendiente';

  constructor(estado: string) {
    super(`El DTE está ${estado}: solo se completan y confirman los DTE pendientes.`);
  }
}

/** Solo se restaura un DTE descartado. */
export class DteNoEstaDescartado extends ReglaDeNegocioInfringida {
  readonly codigo = 'dte_no_esta_descartado';

  constructor() {
    super('Solo se restaura un DTE descartado.');
  }
}

/** El DTE se anuló en la SAT: no se registra. */
export class DteAnuladoEnLaSat extends ReglaDeNegocioInfringida {
  readonly codigo = 'dte_anulado_en_la_sat';

  constructor() {
    super('El DTE está anulado en la SAT: no se registra.');
  }
}

/** El DTE ya está registrado en otra empresa de la misma cuenta; se libera solo si esa empresa lo anula. */
export class DteRegistradoEnOtraEmpresa extends ReglaDeNegocioInfringida {
  readonly codigo = 'dte_registrado_en_otra_empresa';

  constructor() {
    super('Ese DTE ya está registrado en otra empresa de su cuenta.');
  }
}

/** El proveedor del DTE aún no existe: se crea al confirmar, pero la vista previa necesita uno. */
export class DteSinProveedor extends ReglaDeNegocioInfringida {
  readonly codigo = 'dte_sin_proveedor';

  constructor() {
    super('El proveedor de este DTE aún no existe: escoja uno o confirme el DTE para crearlo.', {
      campo: 'proveedorId',
    });
  }
}

/** Falta el concepto de gasto: el Excel de la SAT no lo trae y el proveedor no tiene uno anterior que proponer. */
export class DteSinConcepto extends ReglaDeNegocioInfringida {
  readonly codigo = 'dte_sin_concepto';

  constructor() {
    super('Escoja el concepto de gasto del DTE.', { campo: 'conceptoId' });
  }
}

/** Falta el destino del documento (no hay uno anterior del proveedor que proponer). */
export class DteSinDestino extends ReglaDeNegocioInfringida {
  readonly codigo = 'dte_sin_destino';

  constructor() {
    super('Escoja el destino del DTE.', { campo: 'destino' });
  }
}

/** La empresa es agente de retención del IVA: la fecha de recepción decide la fecha de la retención y no se supone. */
export class FaltaLaFechaDeRecepcion extends ReglaDeNegocioInfringida {
  readonly codigo = 'falta_la_fecha_de_recepcion';

  constructor() {
    super('La empresa es agente de retención del IVA: escriba la fecha de recepción o use la fecha de emisión.', {
      campo: 'fechaRecepcion',
    });
  }
}

/** Una nota se registra contra su factura, que el Excel de la SAT no trae. */
export class DteNotaSinFactura extends ReglaDeNegocioInfringida {
  readonly codigo = 'dte_nota_sin_factura';

  constructor() {
    super('Escoja la factura que corrige la nota.', { campo: 'documentoAfectadoId' });
  }
}

/** Solo una nota de crédito o de débito lleva factura afectada. */
export class FacturaSoloEnNotas extends DatoInvalido {
  readonly codigo = 'factura_solo_en_notas';

  constructor() {
    super('Solo una nota de crédito o de débito lleva la factura que corrige.');
  }
}

/** El IVA del DTE es mayor que el que sale de su total: no se deduce un exento negativo. */
export class ExentoNegativoDelDte extends ReglaDeNegocioInfringida {
  readonly codigo = 'exento_negativo_del_dte';

  constructor() {
    super('El IVA del DTE es mayor que el que corresponde a su total: ábralo en el formulario y revise los montos.');
  }
}

/** El archivo trae montos en columnas que el mapa no conoce: no se puede confirmar en lote sin perderlos. */
export class MontosEnColumnasDesconocidas extends ReglaDeNegocioInfringida {
  readonly codigo = 'montos_en_columnas_desconocidas';

  constructor(columnas: readonly string[]) {
    super(
      `El archivo trae montos en columnas desconocidas (${columnas.join(', ')}): ábralo en el formulario para registrarlos.`,
      { columnas },
    );
  }
}

/** La fecha de recepción o el período del borrador no pueden ser anteriores a la emisión. */
export class BorradorDeDteInvalido extends DatoInvalido {
  readonly codigo = 'borrador_de_dte_invalido';
}
