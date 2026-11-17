import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';
import { fechaLegible, quetzales } from './avisos.js';

/** El retiro del que se quiere pagar no existe, es de otra empresa, ya se liquidó o está anulado. */
export class RetiroNoDisponible extends DatoInvalido {
  readonly codigo = 'retiro_no_disponible';

  constructor() {
    super('Ese retiro está liquidado, anulado o no existe.', { campo: 'retiroId' });
  }
}

/** Lo que se reparte pasa del efectivo que le queda al retiro: se hace otro retiro, no se paga «de la bolsa del custodio». */
export class PagoMayorQueElRetiro extends DatoInvalido {
  readonly codigo = 'pago_mayor_que_el_retiro';

  constructor(retiro: string, disponibleCentavos: number, repartoCentavos: number) {
    super(
      `Al retiro ${retiro} solo le quedan ${quetzales(disponibleCentavos)} en efectivo; este reparto suma ${quetzales(repartoCentavos)}.`,
      { campo: 'pagos' },
    );
  }
}

/** Un proveedor va una sola vez en cada reparto: sus cargos se juntan en un solo pago. */
export class ProveedorRepetidoEnElReparto extends DatoInvalido {
  readonly codigo = 'proveedor_repetido_en_el_reparto';

  constructor(indice: number) {
    super('Ese proveedor aparece dos veces: júntelo en un solo pago.', { campo: `pagos.${indice}.proveedorId` });
  }
}

/** Un reparto lleva de 1 a 20 proveedores. */
export class DemasiadosPagosEnElReparto extends DatoInvalido {
  readonly codigo = 'demasiados_pagos_en_el_reparto';

  constructor(maximo: number) {
    super(`Un reparto lleva de 1 a ${maximo} proveedores.`, { campo: 'pagos' });
  }
}

/** Entre todos los pagos de un reparto hay un tope de documentos (el mismo código que el tope de un pago). */
export class DemasiadosDocumentosEnElReparto extends DatoInvalido {
  readonly codigo = 'demasiados_documentos_en_pago';

  constructor(maximo: number) {
    super(`Un reparto lleva hasta ${maximo} documentos en total.`, { campo: 'pagos' });
  }
}

/** La fecha de un pago en efectivo no es futura (no hay efectivo posfechado) ni anterior al retiro, a la emisión o al inicio. */
export class FechaDePagoEnEfectivoInvalida extends DatoInvalido {
  readonly codigo = 'fecha_de_pago_invalida';

  constructor(minima: string) {
    super(
      `La fecha no puede ser futura ni anterior al ${fechaLegible(minima)} (el retiro, la emisión de los documentos o la fecha de inicio).`,
      { campo: 'fecha' },
    );
  }
}

/** El pago en efectivo llega al umbral de bancarización y la empresa perdería costo o crédito fiscal: solo con permiso y motivo. */
export class EfectivoSobreElUmbral extends ReglaDeNegocioInfringida {
  readonly codigo = 'efectivo_sobre_el_umbral';

  constructor(mensaje: string, indice: number) {
    super(mensaje, { campo: `pagos.${indice}.motivoSinBancarizar`, pago: indice });
  }
}

/** Quien puede pagar en efectivo sobre el umbral escribe por qué lo hace. */
export class MotivoSinBancarizarObligatorio extends DatoInvalido {
  readonly codigo = 'motivo_sin_bancarizar_obligatorio';

  constructor(indice: number) {
    super('Escriba por qué se paga en efectivo sobre el umbral.', { campo: `pagos.${indice}.motivoSinBancarizar` });
  }
}
