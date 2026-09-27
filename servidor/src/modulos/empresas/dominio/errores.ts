import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';

export class NombreDeEmpresaInvalido extends DatoInvalido {
  readonly codigo = 'nombre_de_empresa_invalido';

  constructor(nombre: string) {
    super(`El nombre "${nombre}" no es válido: escriba de 1 a 120 caracteres.`);
  }
}

export class NoSePuedeDesactivarLaEmpresaEnUso extends ReglaDeNegocioInfringida {
  readonly codigo = 'empresa_en_uso';

  constructor() {
    super('No puede desactivar la empresa con la que está trabajando.');
  }
}
