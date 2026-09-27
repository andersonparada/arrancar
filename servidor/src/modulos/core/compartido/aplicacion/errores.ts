import { ErrorEsperado } from '../dominio/errores.js';

/**
 * No existe o no está al alcance de quien lo pide. Ambos casos responden igual
 * para no revelar si un registro de otra cuenta existe.
 */
export class RecursoNoEncontrado extends ErrorEsperado {
  readonly codigo: string = 'no_encontrado';

  constructor(recurso: string) {
    super(`${recurso} no existe o no tiene acceso.`);
  }
}

/** Ya hay un registro con un dato que debe ser único, por ejemplo el mismo NIT. */
export class RecursoDuplicado extends ErrorEsperado {
  readonly codigo: string = 'conflicto';
}

/** El registro está relacionado con otros datos, así que no se puede eliminar. */
export class RecursoEnUso extends ErrorEsperado {
  readonly codigo: string = 'en_uso';

  constructor(mensaje = 'El registro está relacionado con otros datos y no se puede eliminar.') {
    super(mensaje);
  }
}

/** No hay una sesión válida: el cliente vuelve a la pantalla de inicio de sesión. */
export class NoAutenticado extends ErrorEsperado {
  readonly codigo: string = 'no_autenticado';

  constructor(mensaje = 'Debe iniciar sesión.') {
    super(mensaje);
  }
}

export class AccesoDenegado extends ErrorEsperado {
  readonly codigo: string = 'sin_permiso';

  constructor(mensaje = 'No tiene permiso para realizar esta acción.') {
    super(mensaje);
  }
}
