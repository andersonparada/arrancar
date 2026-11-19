import { DatoInvalido, ReglaDeNegocioInfringida } from '../../../core/compartido/dominio/errores.js';

/** De dónde viene el faltante: el movimiento que no alcanza y, cuando se sabe, su artículo. */
export interface OrigenDelFaltante {
  movimientoId?: string;
  articuloId?: string;
}

/** En algún punto de la línea del tiempo la existencia quedaría negativa (INV-P4: nunca se permite). */
export class ExistenciaNegativa extends ReglaDeNegocioInfringida {
  readonly codigo = 'existencia_negativa';

  constructor(
    readonly fecha: string,
    readonly faltante: bigint,
    readonly origen: OrigenDelFaltante = {},
  ) {
    super(`La existencia quedaría negativa el ${fecha}.`, { fecha, faltante: faltante.toString(), ...origen });
  }

  /** El mismo error, diciendo de qué artículo se trata (el motor no conoce el artículo). */
  paraElArticulo(articuloId: string): ExistenciaNegativa {
    return new ExistenciaNegativa(this.fecha, this.faltante, { ...this.origen, articuloId });
  }
}

/** Un movimiento de valor apunta a una entrada que no tiene capa con existencia. */
export class CapaNoDisponible extends DatoInvalido {
  readonly codigo = 'capa_no_disponible';

  constructor(capaId: string | undefined) {
    super('El valor se aplica a una entrada que ya no tiene existencia.', { capaId });
  }
}

/** No hay de dónde tomar el costo del sobrante: hay que escribirlo a mano. */
export class CostoManualRequerido extends DatoInvalido {
  readonly codigo = 'costo_manual_requerido';

  constructor() {
    super('El artículo no tiene costo de referencia: escriba el costo unitario del sobrante.');
  }
}

/** La base del reparto suma cero o no hay entradas entre las que repartir. */
export class RepartoInvalido extends DatoInvalido {
  readonly codigo = 'reparto_invalido';

  constructor() {
    super('La base del reparto debe sumar más de cero.');
  }
}

/** Una entrada con reparto no aparece en el recorrido y no se conoce su factor de absorción de partida. */
export class FactorInicialFaltante extends ReglaDeNegocioInfringida {
  readonly codigo = 'factor_inicial_faltante';

  constructor(entradaId: string) {
    super('El recálculo debe empezar en la entrada más antigua que recibe un reparto.', { entradaId });
  }
}
