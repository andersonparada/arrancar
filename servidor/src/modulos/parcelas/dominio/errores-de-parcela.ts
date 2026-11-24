import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';

/** Un dato de la parcela no cumple sus reglas. */
export class ParcelaInvalida extends DatoInvalido {
  readonly codigo: string = 'parcela_invalida';
}

/** El código de la madre escrito en una fila importada no es de ninguna parcela (todavía). */
export class ParcelaMadreInexistente extends DatoInvalido {
  readonly codigo = 'parcela_madre_inexistente';

  constructor(codigo: string) {
    super(`No existe la parcela madre con código "${codigo}": cárguela antes, o póngala más arriba en el archivo.`);
  }
}

/** La superficie escrita no es una cifra válida o no se puede convertir a metros cuadrados. */
export class SuperficieInvalida extends DatoInvalido {
  readonly codigo: string = 'superficie_invalida';
}

/** La localidad elegida está inactiva: no se le crean parcelas. */
export class LocalidadInactiva extends DatoInvalido {
  readonly codigo = 'localidad_inactiva';

  constructor() {
    super('La localidad está inactiva: reactívela o elija otra.');
  }
}

/** Una medición no puede regir desde una fecha futura: se registra cuando ya es vigente. */
export class MedicionConFechaFutura extends DatoInvalido {
  readonly codigo = 'medicion_con_fecha_futura';

  constructor() {
    super('La fecha de la medición no puede ser futura: regístrela cuando ya esté vigente.');
  }
}

/** La superficie útil es mayor que la total. */
export class SuperficieUtilMayorQueTotal extends DatoInvalido {
  readonly codigo = 'superficie_util_mayor_que_total';

  constructor() {
    super('La superficie útil no puede ser mayor que la total.');
  }
}

/** Una medición en cuerdas necesita las varas por lado que se usaron. */
export class UnidadSinVarasDeCuerda extends DatoInvalido {
  readonly codigo = 'unidad_sin_varas_de_cuerda';

  constructor() {
    super('Una medición en cuerdas necesita las varas por lado de la cuerda; en otra unidad no se escriben.');
  }
}

/** La madre elegida no está activa. */
export class MadreInactiva extends DatoInvalido {
  readonly codigo = 'madre_inactiva';

  constructor() {
    super('La parcela madre está inactiva: reactívela o elija otra.');
  }
}

/** La madre es de otra localidad. */
export class ParcelaDeOtraLocalidad extends ReglaDeNegocioInfringida {
  readonly codigo = 'parcela_de_otra_localidad';

  constructor() {
    super('La parcela madre debe ser de la misma localidad.');
  }
}

/** Ya se llegó al máximo de niveles de parcelas bajo una localidad. */
export class NivelMaximoDeParcelas extends ReglaDeNegocioInfringida {
  readonly codigo = 'nivel_maximo_de_parcelas';

  constructor(maximo: number) {
    super(`Las parcelas pueden tener hasta ${maximo} niveles bajo la localidad.`);
  }
}

/** Una parcela con subparcelas activas no se inactiva. */
export class ParcelaConHijasActivas extends ReglaDeNegocioInfringida {
  readonly codigo = 'parcela_con_hijas_activas';

  constructor() {
    super('La parcela tiene subparcelas activas: inactívelas primero.');
  }
}

/** Una parcela con subparcelas, mediciones o contratos no se elimina, se inactiva. */
export class ParcelaConRegistros extends ReglaDeNegocioInfringida {
  readonly codigo = 'parcela_con_registros';

  constructor() {
    super('La parcela tiene subparcelas, mediciones u otros registros: no se elimina, se inactiva.');
  }
}

/** Una medición que ya está anulada no se vuelve a anular. */
export class MedicionYaAnulada extends ReglaDeNegocioInfringida {
  readonly codigo = 'medicion_ya_anulada';

  constructor() {
    super('La medición ya está anulada.');
  }
}
