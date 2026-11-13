import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';
import { fechaLegible, quetzales } from './avisos.js';

/** Una nota anulada, o que no es de crédito, no tiene saldo a favor que aplicar. */
export class NoEsNotaConSaldo extends ReglaDeNegocioInfringida {
  readonly codigo = 'no_es_nota_con_saldo';

  constructor(etiqueta: string) {
    super(`El documento ${etiqueta} no es una nota de crédito vigente con saldo a favor.`);
  }
}

/** Un dato de la aplicación que no cumple su regla; `detalles.campo` dice cuál (`aplicaciones.<i>.cargoId`...). */
abstract class DatoDeAplicacionInvalido extends DatoInvalido {
  constructor(mensaje: string, campo: string) {
    super(mensaje, { campo });
  }
}

export class CargoNoDisponible extends DatoDeAplicacionInvalido {
  readonly codigo = 'cargo_no_disponible';

  /** `etiqueta` es nula si el documento no existe en la empresa. */
  constructor(etiqueta: string | null, indice: number) {
    super(
      `El documento ${etiqueta ?? 'elegido'} no es un cargo vigente de este proveedor.`,
      `aplicaciones.${indice}.cargoId`,
    );
  }
}

export class CargoRepetido extends DatoDeAplicacionInvalido {
  readonly codigo = 'cargo_repetido';

  constructor(indice: number) {
    super('Ese documento ya está en la lista: escriba un solo monto por documento.', `aplicaciones.${indice}.cargoId`);
  }
}

export class MontoDeAplicacionInvalido extends DatoDeAplicacionInvalido {
  readonly codigo = 'monto_de_aplicacion_invalido';

  constructor(indice: number) {
    super('El monto a aplicar debe ser mayor que cero.', `aplicaciones.${indice}.monto`);
  }
}

export class AplicacionMayorQueElSaldo extends DatoDeAplicacionInvalido {
  readonly codigo = 'aplicacion_mayor_que_el_saldo';

  constructor(etiqueta: string, saldoCentavos: number, indice: number) {
    super(`El documento ${etiqueta} solo debe ${quetzales(saldoCentavos)}.`, `aplicaciones.${indice}.monto`);
  }
}

export class AplicacionMayorQueElSaldoLibre extends DatoDeAplicacionInvalido {
  readonly codigo = 'aplicacion_mayor_que_el_saldo_libre';

  constructor(etiqueta: string, saldoLibreCentavos: number) {
    super(`La nota ${etiqueta} solo tiene ${quetzales(saldoLibreCentavos)} a favor.`, 'aplicaciones');
  }
}

export class FechaDeAplicacionInvalida extends DatoDeAplicacionInvalido {
  readonly codigo = 'fecha_de_aplicacion_invalida';

  /** `minima` es nula si ningún documento pone límite (solo cuenta que no sea futura). */
  constructor(minima: string | null) {
    const limite = minima
      ? ` ni anterior al ${fechaLegible(minima)} (recepción de los documentos o fecha de inicio)`
      : '';
    super(`La fecha no puede ser futura${limite}.`, 'fecha');
  }
}

export class ReferenciaDeAplicacionInvalida extends DatoDeAplicacionInvalido {
  readonly codigo = 'referencia_de_aplicacion_invalida';

  constructor(maximo: number) {
    super(`La referencia del acuerdo puede tener hasta ${maximo} caracteres.`, 'referencia');
  }
}

/** La aplicación automática es parte de la nota (y la de una contraseña se quita desde la contraseña). */
export class AplicacionNoSeQuita extends ReglaDeNegocioInfringida {
  readonly codigo = 'aplicacion_no_se_quita';

  constructor() {
    super('Esa aplicación se hizo al recibir la nota (o en una contraseña): no se quita aquí.');
  }
}
