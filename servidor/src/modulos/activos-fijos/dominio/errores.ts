import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';

/** Un dato de la clase de activo no cumple sus reglas. */
export class ClaseInvalido extends DatoInvalido {
  readonly codigo = 'clase_invalido';
}

/** El porcentaje fiscal pasa del máximo que la ley permite para el inciso. */
export class ClaseConPorcentajeSobreElMaximo extends DatoInvalido {
  readonly codigo = 'clase_con_porcentaje_sobre_el_maximo';

  constructor(maximo: number) {
    super(`El porcentaje fiscal no puede pasar de ${maximo} % para este inciso.`, { maximo });
  }
}

/** La clase tiene activos o conceptos de gasto ligados: se inactiva en vez de eliminarse. */
export class ClaseEnUso extends ReglaDeNegocioInfringida {
  readonly codigo = 'clase_en_uso';

  constructor() {
    super('La clase tiene activos o conceptos de gasto ligados. Inactívela en vez de eliminarla.');
  }
}
