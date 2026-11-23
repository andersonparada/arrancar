import { ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';

/** Los saldos iniciales cuelgan de la fecha de inicio de la empresa: sin ella no hay día de corte. */
export class SaldoInicialSinFechaDeInicio extends ReglaDeNegocioInfringida {
  readonly codigo = 'saldo_inicial_sin_fecha_de_inicio';

  constructor() {
    super('Fije la fecha de inicio de la empresa (carga inicial) antes de cargar saldos iniciales de inventario.');
  }
}

/** La carga inicial ya se cerró: los saldos iniciales no se tocan (hay que reabrirla). */
export class CargaInicialCerrada extends ReglaDeNegocioInfringida {
  readonly codigo = 'carga_inicial_cerrada';

  constructor() {
    super('La carga inicial de la empresa ya está cerrada: reábrala para cambiar los saldos iniciales de inventario.');
  }
}

/** Ya hay un cierre mensual del inventario: los saldos iniciales que lo respaldan no se tocan. */
export class SaldosConCierres extends ReglaDeNegocioInfringida {
  readonly codigo = 'saldos_con_cierres';

  constructor() {
    super('Ya hay meses de inventario cerrados. Reábralos antes de cambiar los saldos iniciales.');
  }
}

/** Los saldos iniciales se anotan con el método ya elegido: el costo de las capas depende de él (§3.3). */
export class MetodoDeCosteoSinElegir extends ReglaDeNegocioInfringida {
  readonly codigo = 'metodo_de_costeo_sin_elegir';

  constructor() {
    super('Elija el método de costeo (promedio ponderado o PEPS) antes de cargar el primer saldo inicial.');
  }
}

/** Cambiar la fecha de inicio dejaría saldos o movimientos del inventario fuera de la carga inicial (§8). */
export class InventarioConFechaFueraDeLaCarga extends ReglaDeNegocioInfringida {
  readonly codigo = 'inventario_con_fecha_fuera_de_la_carga';

  constructor(motivo: string) {
    super(`No se puede cambiar la fecha de inicio: ${motivo}`);
  }
}
