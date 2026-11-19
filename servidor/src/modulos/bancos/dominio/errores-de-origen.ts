import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';
import { nombreDelModulo } from './conceptos-reservados.js';

/** Lo que generó otro módulo no se corrige, elimina ni blanquea en Bancos: solo se anula (con el aviso al módulo). */
export class MovimientoDeOtroModulo extends ReglaDeNegocioInfringida {
  readonly codigo = 'movimiento_de_otro_modulo';

  constructor() {
    super('Este movimiento lo generó otro módulo: no se corrige, elimina ni blanquea aquí. En Bancos solo se anula.');
  }
}

/** Cuentas por pagar generó o marcó el movimiento y está inactivo: no hay quien revise sus reglas. */
export class ModuloDeOrigenInactivo extends ReglaDeNegocioInfringida {
  readonly codigo = 'modulo_de_origen_inactivo';

  constructor(modulo: string) {
    super(`Active ${nombreDelModulo(modulo)} para cambiar este movimiento: lo generó o lo marcó ese módulo.`);
  }
}

/** Marcar una nota solo tiene sentido si Cuentas por pagar está activo (es quien la usa). */
export class CuentasPorPagarInactivo extends ReglaDeNegocioInfringida {
  readonly codigo = 'cuentas_por_pagar_inactivo';

  constructor() {
    super('Active Cuentas por pagar para marcar notas: es el módulo que las aplica a las facturas.');
  }
}

/** Solo una nota de débito suelta (sin origen, ni de transferencia, ni inverso) y vigente se marca o se desmarca. */
export class NotaNoMarcable extends ReglaDeNegocioInfringida {
  readonly codigo = 'nota_no_marcable';

  constructor() {
    super('Solo una nota de débito suelta y vigente se puede marcar para Cuentas por pagar.');
  }
}

export class NotaYaMarcada extends ReglaDeNegocioInfringida {
  readonly codigo = 'nota_ya_marcada';

  constructor() {
    super('La nota ya está marcada para Cuentas por pagar.');
  }
}

export class NotaNoMarcada extends ReglaDeNegocioInfringida {
  readonly codigo = 'nota_no_marcada';

  constructor() {
    super('La nota no está marcada para Cuentas por pagar.');
  }
}

/** Una nota marcada con desglose lo tiene fijado por Cuentas por pagar: su concepto no se cambia a mano. */
export class NotaMarcadaConDesglose extends ReglaDeNegocioInfringida {
  readonly codigo = 'nota_marcada_con_desglose';

  constructor() {
    super('La nota marcada tiene el reparto por concepto que fijó Cuentas por pagar: no se reclasifica.');
  }
}

/** El movimiento no es del documento (ni del módulo) que pide el cambio. */
export class OrigenDelMovimientoNoCoincide extends ReglaDeNegocioInfringida {
  readonly codigo = 'origen_del_movimiento_no_coincide';

  constructor() {
    super('El movimiento no pertenece al documento que lo pide.');
  }
}

export class MotivoObligatorio extends DatoInvalido {
  readonly codigo = 'motivo_obligatorio';

  constructor() {
    super('Escriba el motivo (hasta 500 letras).');
  }
}

/** El reparto por concepto debe tener al menos una línea con monto positivo. */
export class DesgloseSinLineas extends DatoInvalido {
  readonly codigo = 'desglose_sin_lineas';

  constructor() {
    super('El reparto por concepto necesita al menos una línea con monto mayor que cero.');
  }
}

/** La suma de las líneas del reparto debe ser exactamente el monto del movimiento. */
export class DesgloseNoSuma extends DatoInvalido {
  readonly codigo = 'desglose_no_suma';

  constructor(suma: string, monto: string) {
    super(`Las líneas del reparto suman Q${suma} y el movimiento es de Q${monto}: deben coincidir.`);
  }
}

/** Una clave de concepto de sistema no sirve para el tipo del movimiento (pago en un crédito, reintegro en un débito). */
export class ConceptoDeDesgloseIncompatible extends DatoInvalido {
  readonly codigo = 'concepto_de_desglose_incompatible';

  constructor() {
    super('El concepto del reparto no corresponde al tipo del movimiento (pagos son débitos; reintegros, créditos).');
  }
}
