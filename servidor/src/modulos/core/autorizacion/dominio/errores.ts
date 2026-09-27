import { DatoInvalido, ReglaDeNegocioInfringida } from '../../compartido/dominio/errores.js';

export class NombreDeRolInvalido extends DatoInvalido {
  readonly codigo = 'nombre_de_rol_invalido';

  constructor(nombre: string) {
    super(`El nombre "${nombre}" no es válido: escriba de 1 a 60 caracteres.`);
  }
}

export class PermisoDesconocido extends DatoInvalido {
  readonly codigo = 'permiso_desconocido';

  constructor(permiso: string) {
    super(`El permiso "${permiso}" no existe.`);
  }
}

/** Sin un rol con acceso total, nadie podría administrar la cuenta. */
export class SeNecesitaUnRolConAccesoTotal extends ReglaDeNegocioInfringida {
  readonly codigo = 'se_necesita_un_rol_con_acceso_total';

  constructor() {
    super('Debe existir al menos un rol con acceso total.');
  }
}

export class RolAsignadoAUsuarios extends ReglaDeNegocioInfringida {
  readonly codigo = 'rol_asignado_a_usuarios';

  constructor() {
    super('El rol está asignado a usuarios; reasígnelos antes de eliminarlo.');
  }
}
