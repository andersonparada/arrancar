import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';

/**
 * Los errores y los textos de aviso de los saldos iniciales con partidas (docs/modulos/diseno-bancos-segunda-parte.md
 * §5, §7.3). Los artículos del Código de Comercio que se citan están SOLO aquí: se cotejan con el Decreto 2-70 oficial
 * en un único lugar (§15 punto 8).
 */

/** `AAAA-MM-DD` como `dd/mm/aaaa`. */
export const fechaLegible = (fecha: string): string => fecha.split('-').reverse().join('/');

abstract class DatoDeAperturaInvalido extends DatoInvalido {
  constructor(mensaje: string, campo: string) {
    super(mensaje, { campo });
  }
}

export class SinFechaDeInicio extends ReglaDeNegocioInfringida {
  readonly codigo = 'sin_fecha_de_inicio';
  constructor() {
    super('Defina la fecha de inicio en Empresas antes de cargar los saldos iniciales.');
  }
}

export class CargaInicialCerrada extends ReglaDeNegocioInfringida {
  readonly codigo = 'carga_inicial_cerrada';
  constructor() {
    super('La carga inicial está cerrada: pida que la reabran en Empresas.');
  }
}

export class PartidaDespuesDelCorte extends DatoDeAperturaInvalido {
  readonly codigo = 'partida_despues_del_corte';
  constructor(corte: string) {
    super(`La partida debe ser del ${fechaLegible(corte)} o antes (día anterior a la fecha de inicio).`, 'fecha');
  }
}

export class PosfechadoNoPosterior extends DatoDeAperturaInvalido {
  readonly codigo = 'posfechado_no_posterior';
  constructor(corte: string) {
    super(
      `Un cheque posfechado lleva fecha posterior al ${fechaLegible(corte)}. Si es de esa fecha o antes, cárguelo como cheque en circulación.`,
      'fecha',
    );
  }
}

export class DescripcionDelErrorObligatoria extends DatoDeAperturaInvalido {
  readonly codigo = 'descripcion_del_error_obligatoria';
  constructor() {
    super('Describa el error del banco (qué cargó o abonó mal y cuándo lo corregirá).', 'observaciones');
  }
}

export class SentidoDelErrorObligatorio extends DatoDeAperturaInvalido {
  readonly codigo = 'sentido_del_error_obligatorio';
  constructor() {
    super('Diga si el error del banco suma (crédito) o resta (débito) al saldo en libros.', 'sentido');
  }
}

export class NumeroDeChequeObligatorio extends DatoDeAperturaInvalido {
  readonly codigo = 'numero_de_cheque_obligatorio';
  constructor() {
    super('Escriba el número del cheque.', 'numeroDeCheque');
  }
}

export class PagadorObligatorio extends DatoDeAperturaInvalido {
  readonly codigo = 'pagador_obligatorio';
  constructor() {
    super('Escriba quién debe ese dinero (el pagador del depósito rechazado).', 'pagador');
  }
}

export class InversoDentroDeLaApertura extends DatoDeAperturaInvalido {
  readonly codigo = 'inverso_dentro_de_la_apertura';
  constructor(corte: string) {
    super(`La fecha de la anulación debe ser posterior al ${fechaLegible(corte)} (la fecha de corte).`, 'fecha');
  }
}

export class ChequeDeAperturaYaUsado extends DatoDeAperturaInvalido {
  readonly codigo = 'cheque_de_apertura_ya_usado';
  constructor({ numero, serie, chequera }: { numero: number; serie: string | null; chequera: string }) {
    super(
      `El cheque ${numero} de la serie ${serie ?? '(sin serie)'} ya está emitido o anulado en la chequera ${chequera}.`,
      'numeroDeCheque',
    );
  }
}

export class CuentaConMovimientosAnteriores extends ReglaDeNegocioInfringida {
  readonly codigo = 'cuenta_con_movimientos_anteriores';
  constructor(cantidad: number) {
    super(
      `La cuenta tiene ${cantidad} movimientos anteriores a la fecha de inicio: elimínelos o anúlelos antes de cargar el saldo inicial.`,
    );
  }
}

export class SinSaldoInicial extends ReglaDeNegocioInfringida {
  readonly codigo = 'sin_saldo_inicial';
  constructor() {
    super('Registre primero el saldo según el estado de cuenta de la cuenta.');
  }
}

export class AperturaConConciliacion extends ReglaDeNegocioInfringida {
  readonly codigo = 'apertura_con_conciliacion';
  constructor(mes: string) {
    super(`Elimine la conciliación de ${mes} para corregir el saldo inicial.`);
  }
}

export class MovimientoAntesDeLaApertura extends ReglaDeNegocioInfringida {
  readonly codigo = 'movimiento_antes_de_la_apertura';
  constructor(corte: string) {
    super(
      `La cuenta tiene saldo inicial al ${fechaLegible(corte)}: el movimiento debe ser posterior. Si después del corte aparece una nota del banco anterior a esa fecha (una comisión o un interés que no se registró), no la registre con su fecha: regístrela con una fecha posterior al corte (la del primer mes) y avise a su contador, que decidirá si es un ajuste del período o la corrección de un error de períodos anteriores. Mientras la carga esté abierta, también puede corregir el saldo inicial.`,
    );
  }
}

export class MovimientoAntesDeLaFechaDeInicio extends ReglaDeNegocioInfringida {
  readonly codigo = 'movimiento_antes_de_la_fecha_de_inicio';
  constructor(fechaDeInicio: string) {
    super(`La empresa empezó el ${fechaLegible(fechaDeInicio)}: el movimiento no puede ser anterior a esa fecha.`);
  }
}

export class NoSeAnulaElSaldoDelBanco extends ReglaDeNegocioInfringida {
  readonly codigo = 'no_se_anula_el_saldo_del_banco';
  constructor() {
    super('El saldo del banco no se anula: se corrige o se elimina mientras la carga inicial esté abierta.');
  }
}

export class NoSeBlanqueaUnChequeDeApertura extends ReglaDeNegocioInfringida {
  readonly codigo = 'no_se_blanquea_un_cheque_de_apertura';
  constructor() {
    super('Un cheque de la carga inicial no se blanquea: no se emitió en este sistema.');
  }
}

export class PrimeraConciliacionDeOtroMes extends ReglaDeNegocioInfringida {
  readonly codigo = 'primera_conciliacion_de_otro_mes';
  constructor(periodo: string) {
    super(`La primera conciliación de la cuenta es la de ${periodo}, el mes de la fecha de inicio.`);
  }
}

export class FechaDeInicioConSaldosDeBancos extends ReglaDeNegocioInfringida {
  readonly codigo = 'fecha_de_inicio_con_saldos_de_bancos';
  constructor({ cantidad, fecha, global }: { cantidad: number; fecha: string | null; global: boolean }) {
    super(
      global
        ? `${cantidad} cuentas bancarias tienen un saldo inicial del ${fechaLegible(fecha ?? '')}, posterior a la fecha de inicio nueva. Corríjalos en Bancos → Saldos iniciales antes de cambiar la fecha de inicio.`
        : `${cantidad} cuentas bancarias tienen saldo inicial${fecha ? ` al ${fechaLegible(fecha)}` : ''}: el saldo del estado de cuenta es de esa fecha. Elimínelos en Bancos → Saldos iniciales antes de cambiar la fecha de inicio.`,
    );
  }
}

/** Aviso (sin bloquear) de un cheque que, al corte, ya tiene `meses` desde su fecha (Código de Comercio, art. 508). */
export const mensajeDeChequeAntiguo = (cheque: { numero: number; fecha: string; corte: string; meses: number }) =>
  `El cheque ${cheque.numero} es del ${fechaLegible(cheque.fecha)}: al ${fechaLegible(cheque.corte)} tiene ${cheque.meses} meses. Pasados 6 meses de su fecha, el banco ya no está obligado a pagarlo (Código de Comercio, art. 508). Revise si sigue en circulación o si conviene anularlo y reponerlo.`;

/** Aviso (sin bloquear) de un depósito en tránsito con demasiados días al corte. */
export const mensajeDeDepositoViejo = (deposito: { fecha: string; dias: number }) =>
  `El depósito del ${fechaLegible(deposito.fecha)} tiene ${deposito.dias} días al corte: un depósito tarda uno o dos días en verse en el banco. Revise que de verdad se haya depositado.`;
