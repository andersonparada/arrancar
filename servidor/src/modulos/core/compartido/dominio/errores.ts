/**
 * Error previsto por las reglas del sistema (no un fallo del programa). Cada capa
 * define familias concretas y la capa HTTP decide cómo responder a cada una.
 */
export abstract class ErrorEsperado extends Error {
  /** Identificador estable para el cliente: no cambia aunque cambie el mensaje. */
  abstract readonly codigo: string;

  constructor(
    mensaje: string,
    readonly detalles?: unknown,
  ) {
    super(mensaje);
    this.name = new.target.name;
  }
}

/** Un dato no cumple su formato o sus reglas propias, por ejemplo un NIT con el verificador equivocado. */
export abstract class DatoInvalido extends ErrorEsperado {}

/** La operación contradice una regla del negocio, por ejemplo asignar un papel a un tercero inactivo. */
export abstract class ReglaDeNegocioInfringida extends ErrorEsperado {}

/** El archivo o la carga enviada supera el tamaño permitido (HTTP 413). */
export abstract class CargaDemasiadoGrande extends ErrorEsperado {}

/** Se pidió la misma operación demasiadas veces en poco tiempo (HTTP 429). */
export abstract class DemasiadasSolicitudes extends ErrorEsperado {}
