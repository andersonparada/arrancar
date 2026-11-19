import { deCentavos } from '../../core/compartido/dominio/centavos.js';
import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';
import { montoLegible } from '../../core/compartido/dominio/monto-legible.js';

/** Se repone con al menos un comprobante. */
export class ReposicionSinComprobantes extends DatoInvalido {
  readonly codigo = 'reposicion_sin_comprobantes';

  constructor() {
    super('Escoja al menos un comprobante para reponer.', { campo: 'comprobanteIds' });
  }
}

/** Lo que se repone debe sumar más que cero (las notas de crédito y los sobrantes restan). */
export class ReposicionSinMonto extends ReglaDeNegocioInfringida {
  readonly codigo = 'reposicion_sin_monto';

  constructor(totalCentavos: number) {
    super(`Los comprobantes escogidos suman ${montoLegible(deCentavos(totalCentavos))}: no hay nada que reponer.`);
  }
}

/** Un comprobante que se quiere reponer no es de este fondo. */
export class ComprobanteNoEsDelFondo extends ReglaDeNegocioInfringida {
  readonly codigo = 'comprobante_no_es_del_fondo';

  constructor() {
    super('Uno de los comprobantes no está en este fondo.');
  }
}

/** La reposición no puede ser futura ni anterior a un comprobante que cubre o a la apertura del fondo. */
export class FechaDeLaReposicionInvalida extends DatoInvalido {
  readonly codigo = 'fecha_de_la_reposicion_invalida';

  constructor(detalle: string) {
    super(detalle, { campo: 'fecha' });
  }
}

/** Con la separación de funciones en «bloquear», el custodio no repone su propio fondo. */
export class SeparacionDeFunciones extends ReglaDeNegocioInfringida {
  readonly codigo = 'separacion_de_funciones';

  constructor() {
    super('El custodio del fondo no puede reponerlo: pida a otra persona que lo haga.');
  }
}

/** La reposición ya se anuló. */
export class ReposicionYaAnulada extends ReglaDeNegocioInfringida {
  readonly codigo = 'reposicion_ya_anulada';

  constructor(numero: number) {
    super(`La reposición ${numero} ya está anulada.`);
  }
}

/** El banco ya pagó el cheque (o la nota está conciliada): la reposición no se anula. */
export class ReposicionCobrada extends ReglaDeNegocioInfringida {
  readonly codigo = 'reposicion_cobrada';

  constructor(numero: number) {
    super(`El banco ya pagó el cheque de la reposición ${numero}.`);
  }
}

/** La reposición que cierra el fondo se corrige cerrando de nuevo, no anulándola desde aquí. */
export class ReposicionDelCierre extends ReglaDeNegocioInfringida {
  readonly codigo = 'reposicion_del_cierre';

  constructor(numero: number) {
    super(`La reposición ${numero} es la del cierre del fondo: no se anula desde aquí.`);
  }
}
