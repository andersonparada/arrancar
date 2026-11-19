import { deCentavos } from '../../core/compartido/dominio/centavos.js';
import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';
import { montoLegible } from '../../core/compartido/dominio/monto-legible.js';

const enQuetzales = (centavos: number): string => montoLegible(deCentavos(centavos));

/** El documento ya llegó a Caja chica. */
export class DocumentoYaRecibido extends ReglaDeNegocioInfringida {
  override readonly codigo = 'documento_ya_recibido_en_caja_chica';

  constructor() {
    super('Este documento ya está en Caja chica.');
  }
}

/** La nota de crédito corrige una factura que no pasó por Caja chica. */
export class FacturaDeLaNotaNoRecibida extends ReglaDeNegocioInfringida {
  override readonly codigo = 'factura_de_la_nota_no_recibida_en_caja_chica';

  constructor() {
    super('La nota de crédito corrige una factura que no está en Caja chica: regístrela con el mismo destino.');
  }
}

/** La nota de crédito va al mismo fondo que su factura. */
export class NotaEnOtroFondo extends ReglaDeNegocioInfringida {
  override readonly codigo = 'nota_en_otro_fondo';

  constructor(etiqueta: string) {
    super(`La nota ${etiqueta} debe ir al mismo fondo que su factura (o su factura sigue en la bandeja).`);
  }
}

/** El documento ya está en un fondo. */
export class ComprobanteYaAsignado extends ReglaDeNegocioInfringida {
  override readonly codigo = 'comprobante_ya_asignado';

  constructor(etiqueta: string) {
    super(`El documento ${etiqueta} ya está asignado a un fondo.`);
  }
}

/** El comprobante está en una reposición vigente: primero se anula la reposición. */
export class ComprobanteRepuesto extends ReglaDeNegocioInfringida {
  override readonly codigo = 'comprobante_repuesto';

  constructor(reposicionNumero: number | null) {
    super(`Está en la reposición ${reposicionNumero}: anúlela primero.`);
  }
}

export class ComprobanteYaAnulado extends ReglaDeNegocioInfringida {
  override readonly codigo = 'comprobante_ya_anulado';

  constructor() {
    super('El comprobante ya está anulado.');
  }
}

/** Un documento del libro se anula desde el libro de compras (o se devuelve a la bandeja), no desde aquí. */
export class SoloElValeDeGastoSeAnula extends ReglaDeNegocioInfringida {
  override readonly codigo = 'solo_el_vale_de_gasto_se_anula';

  constructor() {
    super('Un documento se anula desde el libro de compras; aquí solo se anulan los vales de gasto.');
  }
}

/** Solo un documento del libro puede volver a la bandeja. */
export class SoloUnDocumentoVuelveALaBandeja extends ReglaDeNegocioInfringida {
  override readonly codigo = 'solo_un_documento_vuelve_a_la_bandeja';

  constructor() {
    super('Solo un documento del libro puede volver a la bandeja; el vale de gasto se anula.');
  }
}

/** Con notas de crédito en el fondo la factura no puede salir sola (las notas la citan). */
export class FacturaConNotasEnElFondo extends ReglaDeNegocioInfringida {
  override readonly codigo = 'factura_con_notas_en_el_fondo';

  constructor(etiqueta: string) {
    super(`La factura ${etiqueta} tiene notas de crédito en el fondo: devuélvalas primero a la bandeja.`);
  }
}

/** El documento ya está en la bandeja: no hay nada que devolver. */
export class DocumentoYaEstaEnLaBandeja extends ReglaDeNegocioInfringida {
  override readonly codigo = 'documento_ya_esta_en_la_bandeja';

  constructor() {
    super('El documento ya está en la bandeja.');
  }
}

/** El documento ya no está en la bandeja (o no existe). */
export class DocumentoNoEstaEnLaBandeja extends ReglaDeNegocioInfringida {
  override readonly codigo = 'documento_no_esta_en_la_bandeja';

  constructor() {
    super('El documento no está en la bandeja.');
  }
}

/** La fecha del gasto no es futura ni anterior a la apertura del fondo. */
export class FechaDelComprobanteInvalida extends DatoInvalido {
  override readonly codigo = 'fecha_del_comprobante_invalida';

  constructor(detalle: string) {
    super(detalle, { campo: 'fecha' });
  }
}

/** Con este comprobante el fondo gastaría más efectivo del que tiene. */
export class ComprobantesMayoresQueElEfectivo extends ReglaDeNegocioInfringida {
  override readonly codigo = 'comprobantes_mayores_que_el_efectivo';

  constructor(sobranteCentavos: number) {
    super(
      `Con esto el fondo gastaría ${enQuetzales(sobranteCentavos)} más de lo que tiene: registre el faltante con un arqueo o revise los montos.`,
    );
  }
}

export class MotivoSobreElTopeObligatorio extends DatoInvalido {
  override readonly codigo = 'motivo_sobre_el_tope_obligatorio';

  constructor(etiqueta: string) {
    super(`Escriba el motivo por el que el comprobante ${etiqueta} pasa del tope.`, { campo: 'motivoSobreElTope' });
  }
}

export class ValesDeGastoNoPermitidos extends ReglaDeNegocioInfringida {
  override readonly codigo = 'vales_de_gasto_no_permitidos';

  constructor() {
    super('Esta empresa no admite vales de gasto: todo gasto debe tener su factura.');
  }
}

export class MotivoConRetencionObligatorio extends DatoInvalido {
  override readonly codigo = 'motivo_con_retencion_obligatorio';

  constructor(etiqueta: string) {
    super(`Escriba el motivo para pagar del fondo la factura ${etiqueta}, que lleva retención.`, {
      campo: 'motivoConRetencion',
    });
  }
}

/** No se guarda un motivo que no aplica. */
export class MotivoConRetencionSinRetencion extends DatoInvalido {
  override readonly codigo = 'motivo_con_retencion_sin_retencion';

  constructor(etiqueta: string) {
    super(`La factura ${etiqueta} no lleva retención: no escriba motivo de excepción.`, {
      campo: 'motivoConRetencion',
    });
  }
}

export class ConceptoDeGastoInvalido extends DatoInvalido {
  override readonly codigo = 'concepto_de_gasto_invalido';

  constructor() {
    super('Escoja un concepto de gasto activo.', { campo: 'conceptoDeGastoId' });
  }
}

export class MontoDelComprobanteInvalido extends DatoInvalido {
  override readonly codigo = 'monto_del_comprobante_invalido';

  constructor() {
    super('Escriba el monto: debe ser mayor que cero.', { campo: 'monto' });
  }
}

/** El libro dio de baja un documento cuyo comprobante no se ve: está en un fondo que el usuario no tiene asignado. */
export class ComprobanteEnFondoNoAsignado extends ReglaDeNegocioInfringida {
  override readonly codigo = 'comprobante_en_fondo_no_asignado';

  constructor() {
    super(
      'El documento está en un fondo de Caja chica que usted no tiene asignado: pida que se lo asignen o que lo den de baja desde allí.',
    );
  }
}
