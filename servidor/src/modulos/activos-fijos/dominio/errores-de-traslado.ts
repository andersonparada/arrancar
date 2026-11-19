import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';

/** Un dato del traslado o de su boleta no cumple sus reglas. */
export class TrasladoInvalido extends DatoInvalido {
  readonly codigo = 'traslado_invalido';
}

/** La boleta ya está anulada. */
export class TrasladoNoAnulable extends ReglaDeNegocioInfringida {
  readonly codigo = 'traslado_no_anulable';

  constructor() {
    super('La boleta de traslado ya está anulada.');
  }
}

/** La fecha del traslado es anterior a la del último traslado del activo. */
export class FechaAnteriorAlUltimoTraslado extends ReglaDeNegocioInfringida {
  readonly codigo = 'fecha_anterior_al_ultimo_traslado';

  constructor(codigoDelActivo: string, ultimaFecha: string) {
    super(`El activo ${codigoDelActivo} tuvo un traslado el ${ultimaFecha}: la fecha no puede ser anterior.`, {
      codigoDelActivo,
      ultimaFecha,
    });
  }
}

/** Solo se anula el último traslado de cada activo: antes hay que anular los posteriores. */
export class TrasladoNoEsElUltimo extends ReglaDeNegocioInfringida {
  readonly codigo = 'traslado_no_es_el_ultimo';

  constructor(codigoDelActivo: string) {
    super(`El activo ${codigoDelActivo} tiene un traslado posterior. Anule primero el más reciente.`, {
      codigoDelActivo,
    });
  }
}

/** Un componente se mueve con su activo principal, no solo. */
export class ComponenteSeTrasladaConSuPrincipal extends ReglaDeNegocioInfringida {
  readonly codigo = 'componente_se_traslada_con_su_principal';

  constructor(codigoDelActivo: string) {
    super(`El activo ${codigoDelActivo} es un componente: se traslada junto con su activo principal.`, {
      codigoDelActivo,
    });
  }
}

/** Trasladar solo una parte de un grupo exige dividirlo antes (AFI-6). */
export class TrasladoParcialNoDisponible extends ReglaDeNegocioInfringida {
  readonly codigo = 'traslado_parcial_no_disponible';

  constructor(codigoDelActivo: string) {
    super(`El traslado de solo una parte de las unidades de ${codigoDelActivo} todavía no está disponible.`, {
      codigoDelActivo,
    });
  }
}
