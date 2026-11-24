import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';

const mesDe = (periodo: string): string => periodo.slice(0, 7);

/** Se pidió cerrar un mes que no es el siguiente al último cerrado: los cierres van en orden, sin huecos. */
export class MesAnteriorSinCerrar extends ReglaDeNegocioInfringida {
  readonly codigo = 'mes_anterior_sin_cerrar';

  constructor(siguiente: string) {
    super(`Primero cierre el mes ${mesDe(siguiente)}: los meses se cierran en orden.`, { siguiente });
  }
}

/** Se pidió cerrar un mes posterior al mes en curso: las existencias de un mes que no ha llegado no se congelan. */
export class MesPorLlegar extends ReglaDeNegocioInfringida {
  readonly codigo = 'mes_por_llegar';

  constructor(periodo: string) {
    super(`El mes ${mesDe(periodo)} todavía no llega: solo se cierra el mes en curso o uno anterior.`, { periodo });
  }
}

/** El mes pedido es anterior al primero que se puede cerrar (la fecha de inicio de la empresa o el primer movimiento). */
export class MesAnteriorAlInicio extends ReglaDeNegocioInfringida {
  readonly codigo = 'mes_anterior_al_inicio';

  constructor(primero: string) {
    super(`No hay inventario antes de ${mesDe(primero)}, el primer mes por cerrar.`, { primero });
  }
}

/** Todavía no hay de dónde empezar a cerrar: ni fecha de inicio de la empresa ni movimientos de inventario. */
export class SinMesPorCerrar extends ReglaDeNegocioInfringida {
  readonly codigo = 'sin_mes_por_cerrar';

  constructor() {
    super('No hay ningún mes por cerrar: registre la fecha de inicio de la empresa o algún movimiento de inventario.');
  }
}

/** La revisión tiene hallazgos que bloquean el cierre. `detalles` lleva esos hallazgos. */
export class CierreConBloqueos extends ReglaDeNegocioInfringida {
  readonly codigo = 'cierre_con_bloqueos';

  constructor(hallazgos: unknown) {
    super('Hay hallazgos que impiden cerrar el mes: resuélvalos y vuelva a revisar.', hallazgos);
  }
}

/** Lo que se revisó cambió antes de confirmar el cierre. `detalles` lleva la revisión nueva. */
export class RevisionDelCierreDesactualizada extends ReglaDeNegocioInfringida {
  readonly codigo = 'revision_del_cierre_desactualizada';

  constructor(revision: unknown) {
    super('Los datos cambiaron mientras revisaba: vuelva a revisar antes de cerrar el mes.', revision);
  }
}

/** Reabrir un mes que no es el último cerrado dejaría meses posteriores calculados sobre cifras que cambian. */
export class SoloSeReabreElUltimo extends ReglaDeNegocioInfringida {
  readonly codigo = 'solo_se_reabre_el_ultimo';

  constructor(ultimo: string | null) {
    super(
      ultimo
        ? `Solo se reabre el último mes cerrado (${mesDe(ultimo)}); para llegar a uno anterior, reabra de uno en uno.`
        : 'No hay ningún mes cerrado que reabrir.',
      { ultimo },
    );
  }
}

/** Cerrar y reabrir congelan y sueltan las existencias de todas las bodegas: quien no las ve todas no puede hacerlo. */
export class CierreSinAlcanceTotal extends ReglaDeNegocioInfringida {
  readonly codigo = 'cierre_sin_alcance_total';

  constructor() {
    super('Para revisar, cerrar o reabrir un mes necesita ver todas las bodegas de la empresa.');
  }
}

/** Las cantidades por bodega de un artículo no suman lo que dice su kardex: el cierre no puede congelar una foto falsa. */
export class FotoDelCierreNoCuadra extends ReglaDeNegocioInfringida {
  readonly codigo = 'foto_del_cierre_no_cuadra';

  constructor(articuloId: string) {
    super('Las existencias por bodega de un artículo no cuadran con su kardex: avise a soporte antes de cerrar.', {
      articuloId,
    });
  }
}

/** Reabrir un mes exige un motivo de 1 a 500 caracteres. */
export class MotivoDeReaperturaInvalido extends DatoInvalido {
  readonly codigo = 'motivo_de_reapertura_invalido';

  constructor() {
    super('Escriba el motivo de la reapertura (hasta 500 caracteres).');
  }
}
