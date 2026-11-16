import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';
import { fechaLegible, quetzales } from './avisos.js';

/** Un dato del pago que no cumple su regla; `detalles.campo` dice cuál (`aplicaciones.<i>.monto`, `fecha`...). */
abstract class DatoDelPagoInvalido extends DatoInvalido {
  constructor(mensaje: string, campo: string) {
    super(mensaje, { campo });
  }
}

export class PagoSinDocumentos extends DatoDelPagoInvalido {
  readonly codigo = 'pago_sin_documentos';

  constructor() {
    super('Elija al menos un documento.', 'aplicaciones');
  }
}

export class DemasiadosDocumentosEnPago extends DatoDelPagoInvalido {
  readonly codigo = 'demasiados_documentos_en_pago';

  constructor(maximo: number) {
    super(`Un pago lleva hasta ${maximo} documentos.`, 'aplicaciones');
  }
}

export class MontoDePagoInvalido extends DatoDelPagoInvalido {
  readonly codigo = 'monto_de_pago_invalido';

  constructor(campo: string) {
    super('El monto debe ser mayor que cero.', campo);
  }
}

export class PagoMayorQueElSaldo extends DatoDelPagoInvalido {
  readonly codigo = 'pago_mayor_que_el_saldo';

  constructor(etiqueta: string, saldoCentavos: number, indice: number) {
    super(`El documento ${etiqueta} solo debe ${quetzales(saldoCentavos)}.`, `aplicaciones.${indice}.monto`);
  }
}

export class DocumentoFueraDeLaContrasena extends DatoDelPagoInvalido {
  readonly codigo = 'documento_fuera_de_la_contrasena';

  constructor(etiqueta: string, indice: number) {
    super(`El documento ${etiqueta} no está en una contraseña vigente.`, `aplicaciones.${indice}.cargoId`);
  }
}

/** La fecha del pago no precede a la emisión de los documentos ni a la fecha de inicio (cuando hay un saldo inicial). */
export class FechaInvalidaDelPago extends DatoDelPagoInvalido {
  readonly codigo = 'fecha_de_pago_invalida';

  constructor(minima: string) {
    super(
      `La fecha no puede ser anterior al ${fechaLegible(minima)} (emisión de los documentos o fecha de inicio).`,
      'fecha',
    );
  }
}

export class DiferenciaFueraDelPago extends DatoDelPagoInvalido {
  readonly codigo = 'diferencia_fuera_del_pago';

  constructor(indice: number) {
    super('Solo se salda la diferencia de un documento de este pago.', `diferencias.${indice}.cargoId`);
  }
}

/** La diferencia que se da por saldada no puede pasar de lo que queda del cargo después del pago. */
export class DiferenciaMayorQueElSaldo extends DatoDelPagoInvalido {
  readonly codigo = 'diferencia_mayor_que_el_saldo';

  constructor(etiqueta: string, restanteCentavos: number, indice: number) {
    super(
      `Al documento ${etiqueta} solo le quedan ${quetzales(restanteCentavos)} después de este pago.`,
      `diferencias.${indice}.monto`,
    );
  }
}

/** La diferencia pasa del tope de redondeo: lo demás es una retención mal calculada o un descuento que pide nota de crédito. */
export class DiferenciaDePagoSobreElTope extends DatoDelPagoInvalido {
  readonly codigo = 'diferencia_de_pago_sobre_el_tope';

  constructor(topeCentavos: number, indice: number) {
    super(
      `Una diferencia al pagar llega hasta ${quetzales(topeCentavos)}. Si el proveedor hizo un descuento, pídale la nota de crédito (Ley del IVA, arts. 17 y 29).`,
      `diferencias.${indice}.monto`,
    );
  }
}

/** Solo se paga lo autorizado. */
export class DocumentoSinAutorizar extends ReglaDeNegocioInfringida {
  readonly codigo = 'documento_sin_autorizar';

  constructor(etiqueta: string) {
    super(`El documento ${etiqueta} no está autorizado: solo se paga lo autorizado.`);
  }
}

/** El cheque o la nota va a nombre del NIT del proveedor: sin ese nombre no se emite. */
export class ProveedorSinNombreDelNit extends ReglaDeNegocioInfringida {
  readonly codigo = 'proveedor_sin_nombre_del_nit';

  constructor() {
    super('Escriba la razón social del proveedor en Terceros: el cheque va a nombre del NIT.');
  }
}

/** La fecha con que se aplica una nota ya registrada no puede ser futura ni anterior a la de la nota o a las de los documentos. */
export class FechaDeAplicacionInvalida extends DatoDelPagoInvalido {
  readonly codigo = 'fecha_de_pago_invalida';

  constructor(minima: string) {
    super(
      `La fecha no puede ser futura ni anterior al ${fechaLegible(minima)} (la nota, la emisión de los documentos o la fecha de inicio).`,
      'fecha',
    );
  }
}

/** La nota que se quiere ligar no es una nota de débito marcada para Cuentas por pagar, está anulada o es de otra empresa. */
export class MovimientoNoLigable extends DatoDelPagoInvalido {
  readonly codigo = 'movimiento_no_ligable';

  constructor() {
    super('Esa nota no está marcada para Cuentas por pagar, está anulada o es de otra empresa.', 'movimientoId');
  }
}

/** El pago pasa de lo que queda de la nota por aplicar. */
export class PagoMayorQueLaNota extends DatoDelPagoInvalido {
  readonly codigo = 'pago_mayor_que_la_nota';

  constructor(nota: string, disponibleCentavos: number) {
    super(`A la nota ${nota} solo le quedan ${quetzales(disponibleCentavos)} por aplicar.`, 'aplicaciones');
  }
}
