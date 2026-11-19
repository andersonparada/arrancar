import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';

/** Un dato de un documento de inventario no cumple sus reglas. */
export class DocumentoInvalido extends DatoInvalido {
  readonly codigo = 'documento_invalido';
}

/** El artículo maneja lotes y el renglón no dice cuál. */
export class LoteObligatorio extends ReglaDeNegocioInfringida {
  readonly codigo = 'lote_obligatorio';

  constructor(articulo: string) {
    super(`El artículo ${articulo} maneja lotes: elija el lote.`);
  }
}

/** El mes del documento ya se cerró: se corrige con un documento nuevo en un mes abierto. */
export class MesCerrado extends ReglaDeNegocioInfringida {
  readonly codigo = 'mes_cerrado';

  constructor(periodo: string) {
    super(`El mes ${periodo.slice(0, 7)} está cerrado en el inventario.`, { periodo });
  }
}

/** La fecha es anterior al inicio de la empresa: lo anterior entra como saldo inicial. */
export class FechaAnteriorAlInicio extends ReglaDeNegocioInfringida {
  readonly codigo = 'fecha_anterior_al_inicio';

  constructor(fechaDeInicio: string) {
    super(`La fecha es anterior al inicio de la empresa (${fechaDeInicio}): registre un saldo inicial.`, {
      fechaDeInicio,
    });
  }
}

/** El documento ya estaba anulado. */
export class DocumentoYaAnulado extends ReglaDeNegocioInfringida {
  readonly codigo = 'documento_ya_anulado';

  constructor() {
    super('El documento ya está anulado.');
  }
}

/** El destino de la salida todavía no está disponible (necesita Activos fijos). */
export class DestinoNoDisponible extends ReglaDeNegocioInfringida {
  readonly codigo = 'destino_no_disponible';

  constructor() {
    super('Ese destino llega con la integración con Activos fijos: por ahora solo se puede sacar a gasto.');
  }
}

/** La bodega o el artículo está inactivo y no admite movimientos. */
export class ElementoInactivo extends ReglaDeNegocioInfringida {
  readonly codigo = 'elemento_inactivo';

  constructor(elemento: string) {
    super(`${elemento} está inactivo y no admite movimientos.`);
  }
}

/** El método de costeo ya lo usó un movimiento: no se vuelve a elegir (para cambiarlo se pide autorización de la SAT). */
export class MetodoFijado extends ReglaDeNegocioInfringida {
  readonly codigo = 'metodo_fijado';

  constructor() {
    super('El método de costeo ya se usó en un movimiento: solo se cambia con la autorización de la SAT.');
  }
}
