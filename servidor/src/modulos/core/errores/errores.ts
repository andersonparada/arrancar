/** Error esperado de la aplicación; el manejador HTTP lo traduce a una respuesta JSON. */
export abstract class ErrorAplicacion extends Error {
  abstract readonly codigoHttp: number;
  abstract readonly codigo: string;

  constructor(
    mensaje: string,
    readonly detalles?: unknown,
  ) {
    super(mensaje);
    this.name = new.target.name;
  }
}

export class ErrorSolicitudInvalida extends ErrorAplicacion {
  readonly codigoHttp = 400;
  readonly codigo = 'solicitud_invalida';
}

export class ErrorNoAutenticado extends ErrorAplicacion {
  readonly codigoHttp = 401;
  readonly codigo = 'no_autenticado';

  constructor(mensaje = 'Debe iniciar sesión.') {
    super(mensaje);
  }
}

export class ErrorSinPermiso extends ErrorAplicacion {
  readonly codigoHttp = 403;
  readonly codigo = 'sin_permiso';

  constructor(mensaje = 'No tiene permiso para realizar esta acción.') {
    super(mensaje);
  }
}

export class ErrorNoEncontrado extends ErrorAplicacion {
  readonly codigoHttp = 404;
  readonly codigo = 'no_encontrado';

  constructor(recurso: string) {
    super(`${recurso} no existe o no tiene acceso.`);
  }
}

export class ErrorConflicto extends ErrorAplicacion {
  readonly codigoHttp = 409;
  readonly codigo = 'conflicto';
}

export class ErrorReglaNegocio extends ErrorAplicacion {
  readonly codigoHttp = 422;
  readonly codigo = 'regla_negocio';
}
