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

export class MovimientoDeCheque extends ReglaDeNegocioInfringida {
  readonly codigo = 'movimiento_de_cheque';

  constructor() {
    super('Este movimiento es un cheque: anule el cheque.');
  }
}

export class NoEsUnaNota extends ReglaDeNegocioInfringida {
  readonly codigo = 'no_es_una_nota';

  constructor() {
    super('El saldo inicial se registra y corrige desde la ficha de la cuenta.');
  }
}

export class NoEsUnSaldoInicial extends ReglaDeNegocioInfringida {
  readonly codigo = 'no_es_un_saldo_inicial';

  constructor() {
    super('Este movimiento no es el saldo inicial de la cuenta.');
  }
}

export class ChequeNoEmitido extends ReglaDeNegocioInfringida {
  readonly codigo = 'cheque_no_emitido';

  constructor() {
    super('Solo se puede blanquear un cheque emitido.');
  }
}

export class ChequeraDemasiadoGrande extends DatoInvalido {
  readonly codigo = 'chequera_demasiado_grande';

  constructor(maximo: number) {
    super(`Una chequera no puede tener más de ${maximo} cheques.`);
  }
}

export class RangoDeChequesTraslapado extends ReglaDeNegocioInfringida {
  readonly codigo = 'rango_de_cheques_traslapado';

  constructor() {
    super('Ese rango de cheques se traslapa con otra chequera de la misma cuenta.');
  }
}

export class ChequeraInactiva extends ReglaDeNegocioInfringida {
  readonly codigo = 'chequera_inactiva';

  constructor() {
    super('La chequera está inactiva: no se le pueden emitir cheques.');
  }
}

export class ChequeNoDisponible extends ReglaDeNegocioInfringida {
  readonly codigo = 'cheque_no_disponible';

  constructor() {
    super('Este cheque no está disponible.');
  }
}

export class ChequeAnulado extends ReglaDeNegocioInfringida {
  readonly codigo = 'cheque_anulado';

  constructor() {
    super('Este cheque ya está anulado.');
  }
}

export class BeneficiarioObligatorio extends DatoInvalido {
  readonly codigo = 'beneficiario_obligatorio';

  constructor() {
    super('Escriba el beneficiario del cheque.');
  }
}

export class MesConciliado extends ReglaDeNegocioInfringida {
  readonly codigo = 'mes_conciliado';

  constructor(fechaConciliada: string) {
    const [anio, mes, dia] = fechaConciliada.split('-');
    super(
      `La cuenta está conciliada hasta el ${dia}/${mes}/${anio}: no se puede registrar, corregir ni anular nada con fecha anterior o igual.`,
    );
  }
}

export class ConciliacionNoEstaEnProceso extends ReglaDeNegocioInfringida {
  readonly codigo = 'conciliacion_no_esta_en_proceso';

  constructor() {
    super('Esta conciliación ya no está en proceso: no se le pueden cambiar las marcas.');
  }
}

export class ConciliacionNoEstaElaborada extends ReglaDeNegocioInfringida {
  readonly codigo = 'conciliacion_no_esta_elaborada';

  constructor() {
    super('Esta conciliación no está elaborada: no se puede autorizar ni devolver.');
  }
}

export class AutorizaQuienElaboro extends ReglaDeNegocioInfringida {
  readonly codigo = 'autoriza_quien_elaboro';

  constructor() {
    super('Quien elaboró la conciliación no la puede autorizar: debe hacerlo otra persona.');
  }
}

export class MesNoHaTerminado extends ReglaDeNegocioInfringida {
  readonly codigo = 'mes_no_ha_terminado';

  constructor() {
    super('Solo se pueden conciliar meses que ya terminaron.');
  }
}

export class ConciliacionFueraDeOrden extends ReglaDeNegocioInfringida {
  readonly codigo = 'conciliacion_fuera_de_orden';

  constructor(esperado: { anio: number; mes: number }) {
    super(`Debe conciliar primero ${String(esperado.mes).padStart(2, '0')}/${esperado.anio}.`);
  }
}

export class HayUnaConciliacionAbierta extends ReglaDeNegocioInfringida {
  readonly codigo = 'hay_una_conciliacion_abierta';

  constructor() {
    super('Esta cuenta ya tiene una conciliación sin autorizar: termínela y autorícela antes de iniciar otra.');
  }
}

export class MovimientoNoConciliable extends ReglaDeNegocioInfringida {
  readonly codigo = 'movimiento_no_conciliable';

  constructor() {
    super('Alguno de los movimientos elegidos no se puede marcar en esta conciliación.');
  }
}

export class SoloSeEliminaLaUltima extends ReglaDeNegocioInfringida {
  readonly codigo = 'solo_se_elimina_la_ultima';

  constructor() {
    super('Solo se puede eliminar la última conciliación de la cuenta.');
  }
}

export * from './errores-de-reversion.js';

export class MovimientoSinNumero extends ReglaDeNegocioInfringida {
  readonly codigo = 'movimiento_sin_numero';

  constructor() {
    super('Los cheques, el saldo inicial y las notas de una transferencia no llevan número propio.');
  }
}
