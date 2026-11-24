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

/** No se encontró un código libre para proponer: que el usuario escriba uno. */
export class SinCodigoLibre extends ReglaDeNegocioInfringida {
  readonly codigo = 'sin_codigo_libre';

  constructor() {
    super('No se pudo proponer un código libre para el artículo. Escríbalo a mano.');
  }
}

/** El artículo tiene movimientos: su unidad base y si maneja lotes ya no cambian (las cantidades están en esa unidad). */
export class UnidadBaseFija extends ReglaDeNegocioInfringida {
  readonly codigo = 'unidad_base_fija';

  constructor() {
    super('El artículo ya tiene movimientos: no se puede cambiar su unidad base ni si maneja lotes.');
  }
}

/** El artículo tiene existencias: se saca todo antes de inactivarlo, porque inactivo no admite movimientos. */
export class ArticuloConExistencias extends ReglaDeNegocioInfringida {
  readonly codigo = 'articulo_con_existencias';

  constructor() {
    super('El artículo tiene existencias. Sáquelas antes de inactivarlo.');
  }
}

/** La bodega es origen o destino de un traslado en camino: inactiva no admite la recepción, y la mercadería quedaría varada. */
export class BodegaConTrasladosEnTransito extends ReglaDeNegocioInfringida {
  readonly codigo = 'bodega_con_traslados_en_transito';

  constructor() {
    super('La bodega tiene traslados en tránsito. Recíbalos o anúlelos antes de inactivarla.');
  }
}

/** La bodega tiene existencias: se sacan o trasladan antes de inactivarla, porque inactiva no admite movimientos. */
export class BodegaConExistencias extends ReglaDeNegocioInfringida {
  readonly codigo = 'bodega_con_existencias';

  constructor() {
    super('La bodega tiene existencias. Sáquelas o trasládelas antes de inactivarla.');
  }
}
