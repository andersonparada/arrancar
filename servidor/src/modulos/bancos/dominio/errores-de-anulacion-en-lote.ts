import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';

/** Un cheque de la anulación en lote que no se pudo anular: cuál y por qué. */
export interface ProblemaDeAnulacionEnLote {
  chequeId: string;
  codigo: string;
  mensaje: string;
}

/** Ningún cheque se anula si alguno falla: los detalles dicen qué cheques tienen problema. */
export class AnulacionEnLoteConProblemas extends ReglaDeNegocioInfringida {
  readonly codigo = 'anulacion_en_lote_con_problemas';

  constructor(problemas: ProblemaDeAnulacionEnLote[]) {
    super(
      `No se anuló ningún cheque: ${problemas.length} tienen problemas. Quítelos de la selección o corríjalos y vuelva a intentar.`,
      problemas,
    );
  }
}

export class ChequeNoEsCaduco extends ReglaDeNegocioInfringida {
  readonly codigo = 'cheque_no_es_caduco';

  constructor() {
    super('El cheque no está emitido y sin cobrar con más meses que el plazo: ya no aparece en cheques caducos.');
  }
}

export class FechaDeAnulacionFutura extends DatoInvalido {
  readonly codigo = 'fecha_de_anulacion_futura';

  constructor() {
    super('La fecha de las notas inversas no puede ser posterior a hoy.');
  }
}
