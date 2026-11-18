import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';

export class FaltaElNombre extends DatoInvalido {
  readonly codigo = 'falta_el_nombre';
}

export class CorreoDeContactoNoSirveParaAvisos extends DatoInvalido {
  readonly codigo = 'correo_de_contacto_no_sirve_para_avisos';

  constructor(correo: string) {
    super(
      `El correo ${correo} no sirve para enviar avisos de pago (solo letras, números y los signos habituales, sin espacios ni comillas). Corríjalo o quite la marca de avisos de pago.`,
    );
  }
}

export class TerceroInactivo extends ReglaDeNegocioInfringida {
  readonly codigo = 'tercero_inactivo';

  constructor() {
    super('Está inactivo; actívelo antes de hacerlo cliente o proveedor.');
  }
}

export class ProveedorInactivo extends ReglaDeNegocioInfringida {
  readonly codigo = 'proveedor_inactivo';

  constructor(nombre: string) {
    super(`El proveedor ${nombre} está inactivo; reactívelo en Proveedores antes de seguir.`);
  }
}

export class ProveedorYaTieneOtroNit extends ReglaDeNegocioInfringida {
  readonly codigo = 'proveedor_con_otro_nit';

  constructor(nitActual: string) {
    super(`El proveedor ya tiene registrado otro NIT (${nitActual}); corríjalo en sus datos antes de seguir.`);
  }
}

export class ProveedorYaTieneOtroDpi extends ReglaDeNegocioInfringida {
  readonly codigo = 'proveedor_con_otro_dpi';

  constructor(dpiActual: string) {
    super(`El proveedor ya tiene registrado otro DPI (${dpiActual}); corríjalo en sus datos antes de seguir.`);
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
