import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';

/** Un dato de la mejora o del costo posterior no cumple sus reglas. */
export class MejoraInvalida extends DatoInvalido {
  readonly codigo = 'mejora_invalida';
}

/** Solo un activo del balance que ya está en uso y se deprecia recibe mejoras y costos posteriores. */
export class ActivoSinDepreciacionParaMejorar extends ReglaDeNegocioInfringida {
  readonly codigo = 'activo_sin_depreciacion_para_mejorar';

  constructor(
    motivo = 'Solo un activo del balance que está en uso y se deprecia recibe mejoras y costos posteriores.',
  ) {
    super(motivo);
  }
}

/** La mejora ya está anulada. */
export class MejoraNoAnulable extends ReglaDeNegocioInfringida {
  readonly codigo = 'mejora_no_anulable';

  constructor() {
    super('La mejora ya está anulada.');
  }
}

/** Un cierre mensual ya usó la depreciación que creó la mejora: se reabre el mes antes de anularla. */
export class MejoraConLibrosUsados extends ReglaDeNegocioInfringida {
  readonly codigo = 'mejora_con_libros_usados';

  constructor() {
    super('Un cierre mensual ya usó la depreciación de esta mejora. Reabra el mes para anularla.');
  }
}

/** Después de la mejora se registró otro cambio de depreciación que parte de ella: primero se anula ese. */
export class MejoraConCambiosPosteriores extends ReglaDeNegocioInfringida {
  readonly codigo = 'mejora_con_cambios_posteriores';

  constructor() {
    super('El activo tiene otra mejora o cambio de depreciación posterior. Anule primero la más reciente.');
  }
}

/** El tramo nuevo no puede empezar antes que el último cambio de depreciación del activo. */
export class CambioAnteriorAlUltimoTramo extends ReglaDeNegocioInfringida {
  readonly codigo = 'cambio_anterior_al_ultimo_tramo';

  constructor(desde: string) {
    super(`La fecha es anterior al último cambio de depreciación del activo (${desde.slice(0, 7)}).`, { desde });
  }
}

/** El activo ya agotó su vida útil contable: hay que decir cuánta vida le queda. */
export class VidaUtilRestanteRequerida extends DatoInvalido {
  readonly codigo = 'vida_util_restante_requerida';

  constructor() {
    super('La vida útil contable del activo ya se agotó: indique cuántos meses de vida útil le quedan.');
  }
}

/** La mejora quitaría más costo del que tiene el activo, o la suma de sus costos nuevos es cero. */
export class MejoraSinCostoNeto extends DatoInvalido {
  readonly codigo = 'mejora_sin_costo_neto';

  constructor(motivo: string) {
    super(motivo);
  }
}

/** El porcentaje fiscal ya se usó en un cierre: no se cambia (ISR arts. 27 y 28, «una vez adoptado»). */
export class PorcentajeFiscalAdoptado extends ReglaDeNegocioInfringida {
  readonly codigo = 'porcentaje_fiscal_adoptado';

  constructor() {
    super(
      'El porcentaje fiscal no se cambia después del primer cierre que lo usa (Ley del ISR, arts. 27 y 28: una vez adoptado).',
    );
  }
}

/** Una revisión de la estimación o de la matrícula sin los datos que la respaldan. */
export class RevisionInvalida extends DatoInvalido {
  readonly codigo = 'revision_invalida';
}

/** Quitar de uso o eliminar un activo con mejoras o costos posteriores: primero se anulan. */
export class ActivoConMejoras extends ReglaDeNegocioInfringida {
  readonly codigo = 'activo_con_mejoras';

  constructor() {
    super('El activo tiene mejoras o costos posteriores. Anúlelos antes.');
  }
}
