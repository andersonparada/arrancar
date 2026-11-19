import { DatoInvalido, ReglaDeNegocioInfringida } from '../../compartido/dominio/errores.js';

/** Falta (o no sirve) la llave del entorno con que se cifran los secretos. */
export class LlaveDeSecretosNoDisponible extends ReglaDeNegocioInfringida {
  readonly codigo = 'llave_de_secretos_no_disponible';

  constructor() {
    super(
      'Falta la llave de cifrado (CLAVE_SECRETOS) en el entorno del servidor: sin ella no se puede guardar ni usar la contraseña del correo.',
    );
  }
}

/** Todavía no hay servidor de correo guardado, o le falta la contraseña. */
export class ServidorDeCorreoNoConfigurado extends ReglaDeNegocioInfringida {
  readonly codigo = 'servidor_de_correo_no_configurado';

  constructor() {
    super('El servidor de correo no está configurado: guárdelo, con su contraseña, antes de enviar una prueba.');
  }
}

/** Un dato del servidor de correo no cumple las reglas. */
export class ServidorDeCorreoInvalido extends DatoInvalido {
  readonly codigo = 'servidor_de_correo_invalido';
}

/** Cambiar el servidor, el puerto o el usuario sin escribir otra vez la contraseña desviaría la guardada. */
export class CambioDeDestinoSinContrasena extends ServidorDeCorreoInvalido {
  constructor() {
    super('Al cambiar el servidor, el puerto o el usuario hay que escribir otra vez la contraseña.');
  }
}
