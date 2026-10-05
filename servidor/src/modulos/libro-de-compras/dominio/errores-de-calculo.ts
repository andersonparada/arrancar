import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';

/** Lo que el usuario escribió en una línea no se puede calcular (total, exento, galones o tasa). */
export class LineaInvalida extends DatoInvalido {
  readonly codigo = 'linea_invalida';
}

/** El IVA que dice la FEL se aparta del calculado más de lo permitido, o dejaría una línea con IVA negativo o mayor a su gravado. */
export class CorreccionDeIvaExcedida extends DatoInvalido {
  readonly codigo = 'correccion_de_iva_excedida';
}

/** El período del libro contradice las fechas del documento (art. 20 de la Ley del IVA). */
export class PeriodoInvalido extends DatoInvalido {
  readonly codigo = 'periodo_invalido';
}

/** Una línea de combustible no tiene tasa de IDP vigente en la fecha de emisión. La busca el caso de uso. */
export class CombustibleSinTasaVigente extends ReglaDeNegocioInfringida {
  readonly codigo = 'combustible_sin_tasa_vigente';

  constructor(combustible: string, fechaEmision: string) {
    super(`El combustible "${combustible}" no tiene tasa de IDP vigente el ${fechaEmision}.`);
  }
}

/** Una nota de crédito con IVA contra una factura exenta: el IVA que rebaja no existe en la factura (art. 29). */
export class NotaConIvaDeFacturaExenta extends ReglaDeNegocioInfringida {
  readonly codigo = 'nota_con_iva_de_factura_exenta';

  constructor() {
    super('La factura es exenta: la nota de crédito no puede traer IVA. Pida al proveedor que la corrija.');
  }
}

/** El IVA de las notas vigentes de una factura, con el de la nueva, pasa del IVA de la propia factura. */
export class IvaDeNotasExcedeElDeLaFactura extends ReglaDeNegocioInfringida {
  readonly codigo = 'iva_de_notas_excede_el_de_la_factura';

  constructor() {
    super('El IVA de las notas de crédito no puede pasar del IVA de la factura que rebajan.');
  }
}
