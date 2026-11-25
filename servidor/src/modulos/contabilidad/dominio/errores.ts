import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';

/** La máscara de códigos no tiene la forma pedida (de 4 a 6 niveles de dígitos 9 separados por puntos). */
export class MascaraInvalida extends DatoInvalido {
  readonly codigo = 'mascara_invalida';
}

/** El código de la cuenta no cumple la máscara de la empresa. */
export class CodigoFueraDeLaMascara extends DatoInvalido {
  readonly codigo = 'codigo_fuera_de_la_mascara';
}

/** Un dato de la cuenta no cumple sus reglas. */
export class CuentaInvalida extends DatoInvalido {
  readonly codigo = 'cuenta_invalida';
}

/** Los datos del inicio de la contabilidad no cumplen sus reglas. */
export class InicioInvalido extends DatoInvalido {
  readonly codigo = 'inicio_invalido';
}

/** Una cuenta de detalle recibe movimientos: no puede tener cuentas inferiores. */
export class CuentaNoEsDeDetalle extends ReglaDeNegocioInfringida {
  readonly codigo = 'cuenta_no_es_de_detalle';

  constructor(
    mensaje = 'La cuenta superior es de detalle: solo las cuentas de mayor pueden tener cuentas inferiores.',
  ) {
    super(mensaje);
  }
}

/** La cuenta tiene cuentas inferiores: se elimina de abajo hacia arriba. */
export class CuentaConHijas extends ReglaDeNegocioInfringida {
  readonly codigo = 'cuenta_con_hijas';

  constructor() {
    super('La cuenta tiene cuentas inferiores. Elimínelas antes o inactívela.');
  }
}

/** Todavía no hay inicio de la contabilidad: sin él no hay máscara para los códigos. */
export class ContabilidadSinIniciar extends ReglaDeNegocioInfringida {
  readonly codigo = 'contabilidad_sin_iniciar';

  constructor() {
    super('Inicie la contabilidad de la empresa antes de crear cuentas.');
  }
}

/** La máscara no se cambia una vez que hay cuentas. */
export class MascaraConCuentas extends ReglaDeNegocioInfringida {
  readonly codigo = 'mascara_con_cuentas';

  constructor() {
    super('La máscara de códigos no se cambia mientras la empresa tenga cuentas.');
  }
}

/** El caso «desde una fecha posterior» exige la carga inicial cerrada. */
export class CargaInicialAbierta extends ReglaDeNegocioInfringida {
  readonly codigo = 'carga_inicial_abierta';

  constructor() {
    super('Cierre la carga inicial de la empresa antes de iniciar la contabilidad desde una fecha posterior.');
  }
}

/** Un enlace de rol no cumple sus reglas (la llave no corresponde al rol, o no existe). */
export class EnlaceInvalido extends DatoInvalido {
  readonly codigo = 'enlace_invalido';

  /** `campo` dice a qué dato del formulario o columna del Excel se refiere. */
  constructor(mensaje: string, campo?: string) {
    super(mensaje, campo ? { campo } : undefined);
  }
}

/** Una cuenta inactiva no recibe enlaces ni movimientos. */
export class CuentaInactiva extends ReglaDeNegocioInfringida {
  readonly codigo = 'cuenta_inactiva';

  constructor() {
    super('La cuenta está inactiva: reactívela o elija otra.');
  }
}

/** La cuenta está enlazada a un rol de sistema: quítele el enlace antes de inactivarla o de volverla de mayor. */
export class CuentaConEnlaces extends ReglaDeNegocioInfringida {
  readonly codigo = 'cuenta_con_enlaces';

  constructor() {
    super('La cuenta está enlazada a un rol de sistema. Quite sus enlaces contables antes de inactivarla o cambiarla.');
  }
}
