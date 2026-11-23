import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';

/** Una nota corrige una factura del libro o una del sistema anterior; sin ninguna de las dos no se registra. */
export class NotaSinFactura extends DatoInvalido {
  readonly codigo = 'nota_sin_factura';

  constructor() {
    super('La nota debe decir qué factura corrige: una del libro o una del sistema anterior.');
  }
}

/** La nota apunta a la vez a una factura del libro y a una del sistema anterior. */
export class NotaConDosFacturas extends DatoInvalido {
  readonly codigo = 'nota_con_dos_facturas';

  constructor() {
    super('La nota corrige una sola factura: la del libro o la del sistema anterior, no las dos.');
  }
}

/** La factura del sistema anterior debe ser de antes de la fecha de inicio de la empresa. */
export class FacturaAnteriorInvalida extends DatoInvalido {
  readonly codigo = 'factura_anterior_invalida';

  constructor(mensaje: string) {
    super(mensaje);
  }
}

/** El total (o el IVA) de las notas de crédito pasaría de lo que vale la factura con sus notas de débito. */
export class NotaExcedeLaFactura extends ReglaDeNegocioInfringida {
  readonly codigo = 'nota_excede_la_factura';

  constructor() {
    super('Las notas de crédito no pueden rebajar más que la factura (con sus notas de débito), en total ni en IVA.');
  }
}

/** La factura especial recibida del comprador no admite notas: se anula y se registra de nuevo. */
export class NotaSobreFacturaEspecial extends ReglaDeNegocioInfringida {
  readonly codigo = 'nota_sobre_factura_especial';

  constructor() {
    super(
      'Una nota no corrige una factura especial que le emitió su comprador: anule el registro y vuelva a registrarlo.',
    );
  }
}

/** La factura de la nota no es de una familia que admita notas, está anulada o es de otro cliente. */
export class FacturaNoSirveParaLaNota extends ReglaDeNegocioInfringida {
  readonly codigo = 'factura_no_sirve_para_la_nota';

  constructor(mensaje: string) {
    super(mensaje);
  }
}

/** La nota es anterior a la factura que corrige. */
export class NotaAnteriorALaFactura extends DatoInvalido {
  readonly codigo = 'nota_anterior_a_la_factura';

  constructor() {
    super('La nota no puede ser anterior a la factura que corrige.');
  }
}
