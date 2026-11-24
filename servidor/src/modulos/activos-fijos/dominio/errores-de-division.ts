import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';

/** Por qué un activo no se divide (`division_no_permitida`). */
export type CausaDeDivisionNoPermitida =
  | 'dado_de_baja'
  | 'con_componentes'
  | 'es_componente'
  | 'clase_no_divisible'
  | 'saldo_inicial_con_diferencias'
  | 'costos_negativos';

const EXPLICACION: Record<CausaDeDivisionNoPermitida, string> = {
  dado_de_baja: 'Un activo dado de baja no se divide.',
  con_componentes: 'Un activo con componentes no se divide.',
  es_componente: 'Un componente no se divide: se mueve con su principal.',
  clase_no_divisible:
    'Los edificios, terrenos, reproductores, intangibles y derechos de llave no se dividen: su base fiscal tiene topes propios.',
  saldo_inicial_con_diferencias:
    'Este saldo inicial tiene un costo fiscal distinto del contable o de su base: regístrelo en activos separados.',
  costos_negativos: 'El activo tiene costos con total negativo en el libro fiscal o fuera de él.',
};

/** El activo no admite dividirse; `detalles.causa` dice por qué. */
export class DivisionNoPermitida extends ReglaDeNegocioInfringida {
  readonly codigo = 'division_no_permitida';

  constructor(causa: CausaDeDivisionNoPermitida) {
    super(EXPLICACION[causa], { causa });
  }
}

/** La cantidad a separar no cumple `1 <= k < n`. */
export class CantidadASepararInvalida extends DatoInvalido {
  readonly codigo = 'cantidad_a_separar_invalida';

  constructor(cantidadDelActivo: number) {
    super(`La cantidad a separar va desde 1 hasta ${cantidadDelActivo - 1} (menos que la del activo).`, {
      cantidadDelActivo,
    });
  }
}

/** El activo tiene un traslado, mejora o división con fecha posterior a la de la división. */
export class DivisionConMovimientosPosteriores extends ReglaDeNegocioInfringida {
  readonly codigo = 'division_con_movimientos_posteriores';

  constructor(mensaje = 'El activo tiene un traslado, una mejora o una división con fecha posterior.') {
    super(mensaje);
  }
}

/** Un dato de la división (motivo, fecha) no cumple sus reglas. */
export class DivisionInvalida extends DatoInvalido {
  readonly codigo = 'division_invalida';
}

/** La división ya está anulada. */
export class DivisionNoAnulable extends ReglaDeNegocioInfringida {
  readonly codigo = 'division_no_anulable';

  constructor() {
    super('La división ya está anulada.');
  }
}

/** El activo tuvo una división después de la fecha de la baja: las cifras al día de la baja no cuadrarían. */
export class BajaAnteriorAUnaDivision extends ReglaDeNegocioInfringida {
  readonly codigo = 'baja_anterior_a_una_division';

  constructor(codigoDelActivo: string, fechaDeLaDivision: string) {
    super(`El activo ${codigoDelActivo} se dividió el ${fechaDeLaDivision}: la baja no puede ser anterior.`, {
      codigoDelActivo,
      fechaDeLaDivision,
    });
  }
}

/** Un activo con tramos de una división no vuelve a construcción: sus costos y tramos son de la división. */
export class ActivoConDivisiones extends ReglaDeNegocioInfringida {
  readonly codigo = 'activo_con_divisiones';

  constructor() {
    super('El activo viene de una división o la tuvo. Anule la división antes de quitarlo de uso.');
  }
}
