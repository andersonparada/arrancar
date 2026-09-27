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

/** Nombre obligatorio sin espacios sobrantes. */
export function nombreObligatorio(nombre: string, mensajeSiFalta: string): string {
  const limpio = nombre.trim();
  if (!limpio) throw new FaltaElNombre(mensajeSiFalta);
  return limpio;
}
