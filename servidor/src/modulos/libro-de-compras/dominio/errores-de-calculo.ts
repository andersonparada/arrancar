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
