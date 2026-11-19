import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';

/** Los parámetros con que un activo empieza a depreciarse no cumplen las reglas. */
export class ParametrosDeUsoInvalidos extends DatoInvalido {
  readonly codigo = 'parametros_de_uso_invalidos';
}

/** La fecha de inicio de uso no es válida para el activo. */
export class FechaDeUsoInvalida extends DatoInvalido {
  readonly codigo = 'fecha_de_uso_invalida';
}

/** Solo un activo del balance en construcción se pone en uso. */
export class ActivoNoEnConstruccion extends ReglaDeNegocioInfringida {
  readonly codigo = 'activo_no_en_construccion';

  constructor() {
    super('Solo un activo en construcción se pone en uso.');
  }
}

/** Para ponerlo en uso, el activo necesita costos vigentes (salvo los terrenos, que pueden no tenerlos aún). */
export class ActivoSinCosto extends ReglaDeNegocioInfringida {
  readonly codigo = 'activo_sin_costo';

  constructor() {
    super('El activo no tiene costos vigentes: capitalice o registre su costo antes de ponerlo en uso.');
  }
}

/** Quitar de uso solo se hace con un activo del balance que está en uso y no se ha dado de baja. */
export class ActivoSinLibros extends ReglaDeNegocioInfringida {
  readonly codigo = 'activo_sin_libros';

  constructor() {
    super('Solo un activo del balance que está en uso se puede quitar de uso.');
  }
}

/** Un cierre ya usó los tramos del activo: no se deshace el uso (se reabre el mes). */
export class ActivoConLibrosUsados extends ReglaDeNegocioInfringida {
  readonly codigo = 'activo_con_libros_usados';

  constructor() {
    super('Un cierre mensual ya usó la depreciación de este activo. Reabra el mes para deshacer el uso.');
  }
}

/** El mes ya está cerrado: no se cambia lo que lo afecta. */
export class MesCerrado extends ReglaDeNegocioInfringida {
  readonly codigo = 'mes_cerrado';

  constructor(mes: string) {
    super(`El mes ${mes.slice(0, 7)} ya está cerrado. Elija una fecha de un mes abierto.`, { mes });
  }
}
