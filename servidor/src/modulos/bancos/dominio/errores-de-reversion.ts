import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';

export class MovimientoYaRevertido extends ReglaDeNegocioInfringida {
  readonly codigo = 'movimiento_ya_revertido';

  constructor() {
    super('Este movimiento ya fue revertido y no se puede modificar.');
  }
}

export class NoSeRevierteUnInverso extends ReglaDeNegocioInfringida {
  readonly codigo = 'no_se_revierte_un_inverso';

  constructor() {
    super('No se revierte un movimiento inverso: si la anulación fue un error, registre el movimiento de nuevo.');
  }
}

export class FechaDeReversionAnterior extends DatoInvalido {
  readonly codigo = 'fecha_de_reversion_anterior';

  constructor() {
    super('La fecha de la anulación no puede ser anterior a la del movimiento original.');
  }
}

export class NoSeCorrigeUnInverso extends ReglaDeNegocioInfringida {
  readonly codigo = 'no_se_corrige_un_inverso';

  constructor() {
    super('Un movimiento inverso no se corrige: compensa a su original tal como está.');
  }
}

export class NoSeEliminaUnInverso extends ReglaDeNegocioInfringida {
  readonly codigo = 'no_se_elimina_un_inverso';

  constructor() {
    super('Un movimiento inverso no se elimina.');
  }
}

export class NoSeEliminaUnMovimientoRevertido extends ReglaDeNegocioInfringida {
  readonly codigo = 'no_se_elimina_un_movimiento_revertido';

  constructor() {
    super('Este movimiento fue revertido: no se puede eliminar.');
  }
}

export class MovimientoMarcadoEnConciliacion extends ReglaDeNegocioInfringida {
  readonly codigo = 'movimiento_marcado_en_conciliacion';

  constructor() {
    super('Este movimiento ya está marcado en una conciliación: no se puede eliminar.');
  }
}

export class CuentaConConciliaciones extends ReglaDeNegocioInfringida {
  readonly codigo = 'cuenta_con_conciliaciones';

  constructor() {
    super('Esta cuenta ya tiene conciliaciones: no se puede eliminar su saldo inicial.');
  }
}
