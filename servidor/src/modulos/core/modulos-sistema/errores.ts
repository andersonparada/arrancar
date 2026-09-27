import { ReglaDeNegocioInfringida } from '../compartido/dominio/errores.js';

export class ModuloDesconocido extends ReglaDeNegocioInfringida {
  readonly codigo = 'modulo_desconocido';

  constructor(clave: string) {
    super(`El módulo "${clave}" no existe.`);
  }
}

export class FaltanDependenciasDelModulo extends ReglaDeNegocioInfringida {
  readonly codigo = 'faltan_dependencias_del_modulo';
}

export class ModuloEsencial extends ReglaDeNegocioInfringida {
  readonly codigo = 'modulo_esencial';

  constructor(nombre: string) {
    super(`${nombre} es esencial y no se puede desactivar.`);
  }
}

/** Otro módulo activo depende de él: desactivarlo lo dejaría sin funcionar. */
export class ModuloEnUso extends ReglaDeNegocioInfringida {
  readonly codigo = 'modulo_en_uso';
}
