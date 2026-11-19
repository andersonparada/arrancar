import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';

/** Un dato del saldo inicial de un activo no cumple sus reglas. */
export class SaldoInicialInvalido extends DatoInvalido {
  readonly codigo = 'saldo_inicial_invalido';
}

/** Los saldos iniciales cuelgan de la fecha de inicio de la empresa: sin ella no hay día de corte. */
export class SaldoInicialSinFechaDeInicio extends ReglaDeNegocioInfringida {
  readonly codigo = 'saldo_inicial_sin_fecha_de_inicio';

  constructor() {
    super('Fije la fecha de inicio de la empresa (carga inicial) antes de cargar saldos iniciales de activos fijos.');
  }
}

/** La carga inicial ya se cerró: los saldos iniciales no se tocan (hay que reabrirla). */
export class CargaInicialCerrada extends ReglaDeNegocioInfringida {
  readonly codigo = 'carga_inicial_cerrada';

  constructor() {
    super('La carga inicial de la empresa ya está cerrada: reábrala para cambiar los saldos iniciales de activos.');
  }
}

/** Un cierre de depreciación ya usó los saldos: se reabren los meses antes de cambiarlos. */
export class SaldosConCierres extends ReglaDeNegocioInfringida {
  readonly codigo = 'saldos_con_cierres';

  constructor() {
    super('Ya hay meses de depreciación cerrados. Reábralos antes de cambiar los saldos iniciales.');
  }
}

/** El activo de saldo inicial se corrige o se elimina en Saldos iniciales, no en la ficha del activo. */
export class ActivoDeSaldoInicial extends ReglaDeNegocioInfringida {
  readonly codigo = 'activo_de_saldo_inicial';

  constructor() {
    super('Este activo viene de un saldo inicial: corríjalo o elimínelo en Saldos iniciales.');
  }
}

/** Cambiar la fecha de inicio dejaría activos con fechas que no caben en la carga inicial. */
export class ActivosConFechaFueraDeLaCarga extends ReglaDeNegocioInfringida {
  readonly codigo = 'activos_con_fecha_fuera_de_la_carga';

  constructor(motivo: string) {
    super(`No se puede cambiar la fecha de inicio: ${motivo}`);
  }
}
