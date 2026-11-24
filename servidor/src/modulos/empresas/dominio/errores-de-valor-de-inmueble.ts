import { DatoInvalido } from '../../core/compartido/dominio/errores.js';

/** Un dato del valor del inmueble no cumple sus reglas. */
export class ValorDeInmuebleInvalido extends DatoInvalido {
  readonly codigo: string = 'valor_de_inmueble_invalido';
}

/** La categoría del IUSI solo va con el valor de matrícula fiscal, que es la base de ese impuesto. */
export class CategoriaDeIusiFueraDeMatricula extends DatoInvalido {
  readonly codigo = 'categoria_iusi_fuera_de_matricula';

  constructor() {
    super('La categoría del IUSI solo se registra con el valor de la matrícula fiscal.');
  }
}

/** Ya hay un valor de esa fuente con esa fecha: un valor no se edita, se registra otro con otra fecha. */
export class ValorDeInmuebleRepetido extends DatoInvalido {
  readonly codigo = 'valor_de_inmueble_repetido';

  constructor() {
    super('Ya hay un valor de esa fuente con esa fecha. Un valor no se edita: registre otro con otra fecha.');
  }
}
