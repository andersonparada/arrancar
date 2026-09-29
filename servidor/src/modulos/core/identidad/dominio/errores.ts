import { DatoInvalido, ReglaDeNegocioInfringida } from '../../compartido/dominio/errores.js';

/** Quien administra no puede quitarse el acceso ni cambiarse sus roles y permisos: se daría poder a través de sí mismo. */
export class NoPuedeCambiarseASiMismo extends ReglaDeNegocioInfringida {
  readonly codigo = 'no_puede_cambiarse_a_si_mismo';

  constructor() {
    super('No puede cambiar sus propias empresas, roles ni permisos, ni desactivarse.');
  }
}

/**
 * Un usuario que también trabaja para otra cuenta tiene datos que esta cuenta no
 * controla; solo se le pueden cambiar los accesos a las empresas de esta cuenta.
 */
export class UsuarioDeVariasCuentas extends ReglaDeNegocioInfringida {
  readonly codigo = 'usuario_de_varias_cuentas';
}

export class EmpresaRepetida extends DatoInvalido {
  readonly codigo = 'empresa_repetida';

  constructor() {
    super('Una empresa aparece dos veces.');
  }
}

export class EmpresaAjena extends DatoInvalido {
  readonly codigo = 'empresa_ajena';

  constructor() {
    super('Una de las empresas no es válida.');
  }
}

export class RolAjeno extends DatoInvalido {
  readonly codigo = 'rol_ajeno';

  constructor() {
    super('Uno de los roles no es válido.');
  }
}

export class SinNombreDeUsuarioLibre extends ReglaDeNegocioInfringida {
  readonly codigo = 'sin_nombre_de_usuario_libre';

  constructor() {
    super('No se pudo generar un usuario libre con ese nombre; escríbalo a mano (solo letras).');
  }
}

/** Quien cambia su propia contraseña debe escribir la actual. */
export class ContrasenaActualIncorrecta extends DatoInvalido {
  readonly codigo = 'contrasena_actual_incorrecta';

  constructor() {
    super('La contraseña actual no es correcta.');
  }
}
