import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';

/** El documento ya llegó a Cuentas por liquidar. */
export class DocumentoYaRecibido extends ReglaDeNegocioInfringida {
  readonly codigo = 'documento_ya_recibido_en_anticipos';

  constructor() {
    super('Ese documento ya está en Cuentas por liquidar.');
  }
}

/** La nota de crédito corrige una factura que no está en Cuentas por liquidar. */
export class FacturaDeLaNotaNoRecibida extends ReglaDeNegocioInfringida {
  readonly codigo = 'factura_de_la_nota_no_recibida_en_anticipos';

  constructor() {
    super('La factura que corrige esta nota no está en Cuentas por liquidar: registre la nota donde esté su factura.');
  }
}

/** El gasto no está donde la acción lo necesita (ya asignado, quitado o anulado). */
export class GastoNoDisponible extends ReglaDeNegocioInfringida {
  readonly codigo = 'gasto_no_disponible';
}

/** Solo un anticipo abierto recibe y suelta gastos. */
export class AnticipoNoAbierto extends ReglaDeNegocioInfringida {
  readonly codigo = 'anticipo_no_abierto';

  constructor(numero: string, estado: 'liquidado' | 'anulado') {
    super(`El anticipo ${numero} está ${estado}: ya no admite cambios en sus gastos.`);
  }
}

export class FechaDelGastoInvalida extends DatoInvalido {
  readonly codigo = 'fecha_del_gasto_invalida';

  constructor(motivo: string) {
    super(motivo, { campo: 'fecha' });
  }
}

export class MontoDelGastoInvalido extends DatoInvalido {
  readonly codigo = 'monto_del_gasto_invalido';

  constructor() {
    super('Escriba el monto del gasto: debe ser mayor que cero.', { campo: 'monto' });
  }
}

/** La retención se paga con el permiso de excepción y un motivo: sin motivo no se asigna. */
export class MotivoConRetencionObligatorio extends DatoInvalido {
  readonly codigo = 'motivo_con_retencion_obligatorio';

  constructor(etiqueta: string) {
    super(
      `Escriba por qué el documento ${etiqueta}, que lleva retención, se paga con el anticipo (hasta 300 letras).`,
      {
        campo: 'motivoConRetencion',
      },
    );
  }
}

/** Un motivo de retención en un documento que no lleva retención no se guarda. */
export class MotivoConRetencionNoAplica extends DatoInvalido {
  readonly codigo = 'motivo_con_retencion_no_aplica';

  constructor(etiqueta: string) {
    super(`El documento ${etiqueta} no lleva retención: no hace falta motivo.`, { campo: 'motivoConRetencion' });
  }
}

export class GastosSinDocumentoNoPermitidos extends ReglaDeNegocioInfringida {
  readonly codigo = 'gastos_sin_documento_no_permitidos';

  constructor() {
    super('Esta empresa no permite gastos sin documento en los anticipos: pida el documento al beneficiario.');
  }
}

export class ConceptoDeGastoInvalido extends DatoInvalido {
  readonly codigo = 'concepto_de_gasto_invalido';

  constructor() {
    super('Escoja un concepto de gasto activo.', { campo: 'conceptoDeGastoId' });
  }
}

/** Un texto del gasto sin documento va escrito y dentro de su tope. */
export class TextoDelGastoInvalido extends DatoInvalido {
  readonly codigo = 'texto_del_gasto_invalido';

  constructor(campo: string, nombre: string, maximo: number) {
    super(`Escriba ${nombre} (hasta ${maximo} letras).`, { campo });
  }
}

/** La renta del trabajo (V-6) solo cabe cuando el beneficiario es empleado. */
export class RentaDelTrabajoSoloEmpleados extends DatoInvalido {
  readonly codigo = 'renta_del_trabajo_solo_empleados';

  constructor() {
    super('Tratar el gasto como renta del trabajo solo vale si el beneficiario es empleado.', {
      campo: 'tratamiento',
    });
  }
}
