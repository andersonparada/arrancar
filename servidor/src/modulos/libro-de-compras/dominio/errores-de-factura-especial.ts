import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';

/** El vendedor de la factura especial falta, es consumidor final o es la propia empresa. */
export class VendedorDeFacturaEspecialInvalido extends DatoInvalido {
  readonly codigo = 'vendedor_de_factura_especial_invalido';
}

/** El NIT o CUI del vendedor no es el del proveedor: el documento no es de él o el dato está mal escrito. */
export class VendedorNoCoincide extends ReglaDeNegocioInfringida {
  readonly codigo = 'vendedor_no_coincide';

  constructor() {
    super(
      'El NIT o CUI del vendedor no coincide con el del proveedor. Revise la factura especial o elija otro proveedor.',
    );
  }
}

/** La factura especial va siempre en el libro: la emitió la empresa y la SAT la tiene certificada. */
export class FacturaEspecialSiempreEnElLibro extends ReglaDeNegocioInfringida {
  readonly codigo = 'factura_especial_siempre_en_el_libro';

  constructor() {
    super('La factura especial siempre va en el libro de compras: no se puede dejar fuera de los reportes SAT.');
  }
}

/** Una nota de crédito no rebaja una factura especial: se anula y se registra de nuevo. */
export class NotaSobreFacturaEspecial extends ReglaDeNegocioInfringida {
  readonly codigo = 'nota_sobre_factura_especial';

  constructor() {
    super(
      'Una factura especial no se rebaja con nota de crédito en Arrancar: anule la factura especial en su certificador, anule este registro y registre la nueva.',
    );
  }
}

/** Una factura especial no lleva otros impuestos ni IDP (ni en el documento ni en sus líneas). */
export class FacturaEspecialSinOtrosImpuestos extends DatoInvalido {
  readonly codigo = 'factura_especial_sin_otros_impuestos';

  constructor() {
    super('Una factura especial no lleva otros impuestos ni IDP.');
  }
}
