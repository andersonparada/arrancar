import { DatoInvalido, ErrorEsperado, ReglaDeNegocioInfringida } from '../../compartido/dominio/errores.js';

/** El rango de una carga manual no sirve: al revés, de más de 366 días o más allá de mañana. */
export class RangoDeCargaInvalido extends DatoInvalido {
  readonly codigo = 'rango_de_carga_invalido';
}

/** El tipo manual lleva una fecha que aún no llega: el tipo de un día se ingresa cuando el día ya es hoy o pasó. */
export class FechaDeTipoFutura extends DatoInvalido {
  readonly codigo = 'fecha_de_tipo_futura';

  constructor() {
    super('La fecha del tipo de cambio no puede ser posterior a hoy.');
  }
}

/** El servicio del Banco de Guatemala no respondió a tiempo, respondió con error o no se pudo leer. Vale reintentar. */
export class FuenteNoDisponible extends ErrorEsperado {
  readonly codigo = 'FUENTE_DE_TIPOS_DE_CAMBIO_NO_DISPONIBLE';
}

/** La respuesta llegó, pero no es la esperada (XML con entidades, demasiado grande, sin la estructura del servicio). No se reintenta. */
export class RespuestaInvalida extends ErrorEsperado {
  readonly codigo = 'RESPUESTA_DE_TIPOS_DE_CAMBIO_INVALIDA';
}

/** No hay un tipo de cambio utilizable: ninguno en los 7 días anteriores, o la fecha es futura y no está publicada. */
export class TipoDeCambioNoDisponible extends ReglaDeNegocioInfringida {
  readonly codigo = 'tipo_de_cambio_no_disponible';

  constructor(moneda: string, fecha: string, ultimaFechaPublicada: string | null) {
    super(`No hay tipo de cambio de ${moneda} para el ${fecha}; pida a soporte que lo cargue.`, {
      moneda,
      fecha,
      ultimaFechaPublicada,
    });
  }
}

/** El quetzal es la moneda de los libros: no tiene tipo de cambio ni se puede dejar de usar. */
export class TipoDeCambioDelQuetzal extends ReglaDeNegocioInfringida {
  readonly codigo = 'tipo_de_cambio_del_quetzal';

  constructor() {
    super('El quetzal es la moneda de los libros: no tiene tipo de cambio.');
  }
}

export class MonedaBaseNoSeDesactiva extends ReglaDeNegocioInfringida {
  readonly codigo = 'moneda_base_no_se_desactiva';

  constructor() {
    super('El quetzal es la moneda de los libros y no se puede desactivar.');
  }
}

/** En la versión 1 todo el dinero lleva dos decimales: no se activan monedas con otros decimales. */
export class MonedaSinDosDecimales extends ReglaDeNegocioInfringida {
  readonly codigo = 'moneda_sin_dos_decimales';

  constructor(moneda: string, decimales: number) {
    super(`${moneda} lleva ${decimales} decimales; por ahora solo se activan monedas de dos decimales.`);
  }
}

/** Las letras del monto (singular y plural) van las dos o ninguna. */
export class LetrasIncompletas extends ReglaDeNegocioInfringida {
  readonly codigo = 'letras_incompletas';

  constructor() {
    super('Escriba las letras del singular y del plural, o deje las dos vacías.');
  }
}

export class CodigoDelBanguatEnGtq extends ReglaDeNegocioInfringida {
  readonly codigo = 'codigo_del_banguat_en_gtq';

  constructor() {
    super('El quetzal no tiene código del Banguat: no se carga su tipo de cambio.');
  }
}

/** El código no está en la lista del Banguat, ya no está disponible o está excluido. */
export class CodigoDelBanguatNoOfrecido extends ReglaDeNegocioInfringida {
  readonly codigo = 'codigo_del_banguat_no_ofrecido';

  constructor(codigo: number) {
    super(`El código ${codigo} no está entre las monedas que ofrece el Banguat.`);
  }
}

/** El dólar es la base de los cruces: sin su código no hay cómo pasar las demás monedas a quetzales. */
export class CodigoDelDolarNecesario extends ReglaDeNegocioInfringida {
  readonly codigo = 'codigo_del_dolar_necesario';

  constructor(monedas: readonly string[]) {
    super(
      `El dólar necesita su código del Banguat mientras ${monedas.join(', ')} se carguen: sin él no se pueden calcular sus tipos de cambio.`,
      { monedas },
    );
  }
}
