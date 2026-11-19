import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';

/** La unidad de medida está en un artículo o en una conversión: se inactiva en vez de eliminarse. */
export class UnidadEnUso extends ReglaDeNegocioInfringida {
  readonly codigo = 'unidad_en_uso';

  constructor() {
    super('La unidad de medida la usa algún artículo. Inactívela en vez de eliminarla.');
  }
}

/** La categoría tiene artículos: se inactiva en vez de eliminarse. */
export class CategoriaEnUso extends ReglaDeNegocioInfringida {
  readonly codigo = 'categoria_en_uso';

  constructor() {
    super('La categoría tiene artículos. Inactívela en vez de eliminarla.');
  }
}

/** Una conversión no cumple sus reglas (la unidad base no se convierte, el factor es mayor que cero). */
export class ConversionInvalida extends DatoInvalido {
  readonly codigo = 'conversion_invalida';
}

/** Un lote no cumple sus reglas (vencimiento obligatorio, artículo sin lotes). */
export class LoteInvalido extends DatoInvalido {
  readonly codigo = 'lote_invalido';
}
