import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';

export class MontoInvalido extends DatoInvalido {
  readonly codigo = 'monto_invalido';

  constructor() {
    super('El monto debe ser mayor que cero.');
  }
}

export class MovimientoAnulado extends ReglaDeNegocioInfringida {
  readonly codigo = 'movimiento_anulado';

  constructor() {
    super('Este movimiento está anulado y no se puede modificar.');
  }
}

export class MotivoDeAnulacionInvalido extends DatoInvalido {
  readonly codigo = 'motivo_de_anulacion_invalido';

  constructor() {
    super('El motivo de anulación debe tener entre 1 y 500 caracteres.');
  }
}

export class CuentaBancariaInactiva extends ReglaDeNegocioInfringida {
  readonly codigo = 'cuenta_bancaria_inactiva';

  constructor() {
    super('La cuenta bancaria está inactiva: no se le pueden registrar movimientos.');
  }
}

export class SaldoInicialRepetido extends ReglaDeNegocioInfringida {
  readonly codigo = 'saldo_inicial_repetido';

  constructor() {
    super('Ya existe un saldo inicial activo para esta cuenta.');
  }
}

export class SaldoInicialNoEsElPrimero extends ReglaDeNegocioInfringida {
  readonly codigo = 'saldo_inicial_no_es_el_primero';

  constructor() {
    super('El saldo inicial no puede tener una fecha posterior a otros movimientos de la cuenta.');
  }
}

export class MovimientoAntesDelSaldoInicial extends ReglaDeNegocioInfringida {
  readonly codigo = 'movimiento_antes_del_saldo_inicial';

  constructor() {
    super('No se puede registrar un movimiento con fecha anterior al saldo inicial de la cuenta.');
  }
}

export class SaldoInsuficiente extends ReglaDeNegocioInfringida {
  readonly codigo = 'saldo_insuficiente';

  constructor(saldoQueQuedaria: string) {
    super(`La cuenta quedaría con saldo de Q ${saldoQueQuedaria} y esta empresa no permite sobregiros.`);
  }
}

export class TransferenciaALaMismaCuenta extends DatoInvalido {
  readonly codigo = 'transferencia_a_la_misma_cuenta';

  constructor() {
    super('El origen y el destino de una transferencia deben ser cuentas distintas.');
  }
}

export class TransferenciaAnulada extends ReglaDeNegocioInfringida {
  readonly codigo = 'transferencia_anulada';

  constructor() {
    super('Esta transferencia ya está anulada.');
  }
}

export class MovimientoDeTransferencia extends ReglaDeNegocioInfringida {
  readonly codigo = 'movimiento_de_transferencia';

  constructor() {
    super('Esta nota es parte de una transferencia: anule la transferencia.');
  }
}
