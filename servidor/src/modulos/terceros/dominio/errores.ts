import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';

export class FaltaElNombre extends DatoInvalido {
  readonly codigo = 'falta_el_nombre';
}

export class TerceroInactivo extends ReglaDeNegocioInfringida {
  readonly codigo = 'tercero_inactivo';

  constructor() {
    super('Está inactivo; actívelo antes de hacerlo cliente o proveedor.');
  }
}

export class ProveedorYaTieneOtroNit extends ReglaDeNegocioInfringida {
  readonly codigo = 'proveedor_con_otro_nit';

  constructor(nitActual: string) {
    super(`El proveedor ya tiene registrado otro NIT (${nitActual}); corríjalo en sus datos antes de seguir.`);
  }
}

export class NitDeProveedorSinNumero extends DatoInvalido {
  readonly codigo = 'nit_de_proveedor_sin_numero';

  constructor() {
    super('Consumidor final (CF) no sirve como NIT de un proveedor; escriba el NIT del emisor.');
  }
}

/** Nombre obligatorio sin espacios sobrantes. */
export function nombreObligatorio(nombre: string, mensajeSiFalta: string): string {
  const limpio = nombre.trim();
  if (!limpio) throw new FaltaElNombre(mensajeSiFalta);
  return limpio;
}
