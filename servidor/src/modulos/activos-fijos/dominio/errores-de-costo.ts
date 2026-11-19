import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';
import { MAXIMO_DE_UNIDADES } from './tipos-de-costo.js';

/** Un dato del costo no cumple sus reglas. */
export class CostoInvalido extends DatoInvalido {
  readonly codigo = 'costo_invalido';
}

/** El monto no tiene el signo de la línea (las facturas suman, las notas de crédito restan) o es cero. */
export class MontoDeCostoInvalido extends DatoInvalido {
  readonly codigo = 'monto_de_costo_invalido';
}

/** Con lo capitalizado, la suma de los costos de la línea pasaría de lo que costó. */
export class LineaSobrecapitalizada extends ReglaDeNegocioInfringida {
  readonly codigo = 'linea_sobrecapitalizada';

  constructor(pendienteCentavos: number) {
    super('Esa línea no tiene tanto costo pendiente de capitalizar.', { pendienteCentavos });
  }
}

/** La línea se descartó en la bandeja: primero hay que devolverla. */
export class LineaDescartada extends ReglaDeNegocioInfringida {
  readonly codigo = 'linea_descartada';

  constructor() {
    super('La línea está descartada. Devuélvala a la bandeja para capitalizarla.');
  }
}

/** La línea no existe, es de un documento anulado o no está marcada como activo fijo. */
export class LineaNoCapitalizable extends ReglaDeNegocioInfringida {
  readonly codigo = 'linea_no_capitalizable';

  constructor(motivo = 'La línea no se puede capitalizar: su documento está anulado o no la marcó como activo fijo.') {
    super(motivo);
  }
}

/** Una línea con costos vigentes ya se capitalizó: no se descarta (hay que anular sus costos antes). */
export class LineaConCostos extends ReglaDeNegocioInfringida {
  readonly codigo = 'linea_con_costos';

  constructor() {
    super('La línea ya tiene costos capitalizados. Anúlelos antes de descartarla.');
  }
}

/** La línea ya está descartada, o no lo está cuando se pide devolverla. */
export class DescarteNoVigente extends ReglaDeNegocioInfringida {
  readonly codigo = 'descarte_no_vigente';
}

/** La suma de los costos vigentes de un activo nunca queda negativa (V-6). */
export class CostoDeActivoNegativo extends ReglaDeNegocioInfringida {
  readonly codigo = 'costo_de_activo_negativo';

  constructor(codigoDelActivo: string) {
    super(`El costo del activo ${codigoDelActivo} quedaría negativo: la nota de crédito es mayor que lo capitalizado.`);
  }
}

/** Se piden más unidades de las que caben en una operación. */
export class DemasiadasUnidades extends DatoInvalido {
  readonly codigo = 'demasiadas_unidades';

  constructor() {
    super(`Una operación crea como máximo ${MAXIMO_DE_UNIDADES} unidades.`, { maximo: MAXIMO_DE_UNIDADES });
  }
}

/** Una alta conjunta sin activos vigentes (todos se dieron de baja) no recibe costos. */
export class AltaConjuntaSinActivosVigentes extends ReglaDeNegocioInfringida {
  readonly codigo = 'alta_conjunta_sin_activos_vigentes';

  constructor() {
    super('Esa compra conjunta no tiene activos vigentes: todos se dieron de baja o no existe.');
  }
}

/** Un renglón de la cuadrícula de unidades cuyo código se repite o ya usa otro activo. */
export interface RenglonRepetido {
  asignacion: number;
  renglon: number;
  codigo: string;
  causa: 'repetido_en_la_cuadricula' | 'ya_usado_por_otro_activo';
}

/** Un código de la cuadrícula se repite o ya lo usa otro activo; los renglones dicen cuáles. */
export class CodigosDeUnidadesRepetidos extends DatoInvalido {
  readonly codigo = 'codigos_de_unidades_repetidos';

  constructor(renglones: readonly RenglonRepetido[]) {
    super('Hay códigos repetidos o que ya usa otro activo. Revise los renglones marcados.', { renglones });
  }
}

/** Un bien de terceros no es de la empresa: no lleva costos. */
export class ActivoDeTercerosSinCostos extends ReglaDeNegocioInfringida {
  readonly codigo = 'activo_de_terceros_sin_costos';

  constructor() {
    super('Un bien de terceros no es de la empresa: no lleva costos.');
  }
}

/** Un activo ya en uso recibe sus costos como mejora o costo posterior (AF-7), no por la capitalización ni a mano. */
export class CostoPosteriorNoDisponible extends ReglaDeNegocioInfringida {
  readonly codigo = 'costo_posterior_no_disponible';

  constructor() {
    super(
      'Un activo en uso recibe sus costos como mejora o costo posterior: regístrelo desde Mejoras. Para quitarlos, anule la mejora.',
    );
  }
}

/** Los documentos con costos capitalizados no se anulan ni se eliminan en el libro (R-1). */
export class DocumentoConCostosCapitalizados extends ReglaDeNegocioInfringida {
  readonly codigo = 'documento_con_costos_capitalizados';

  constructor(codigosDeActivos: readonly string[]) {
    super(
      `El documento tiene costos capitalizados en Activos fijos (${codigosDeActivos.join(', ')}). ` +
        'Anule esos costos antes de anular o eliminar el documento.',
      { activos: codigosDeActivos },
    );
  }
}

/** Un costo anulado ya no se anula otra vez, y el de saldo inicial se corrige en Saldos iniciales. */
export class CostoNoAnulable extends ReglaDeNegocioInfringida {
  readonly codigo = 'costo_no_anulable';
}
