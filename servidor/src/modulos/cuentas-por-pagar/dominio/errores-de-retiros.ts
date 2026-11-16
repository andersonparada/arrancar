import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';
import { fechaLegible, quetzales } from './avisos.js';

/** Un retiro es efectivo que ya salió del banco: no puede tener fecha futura. */
export class FechaDeRetiroInvalida extends DatoInvalido {
  readonly codigo = 'fecha_de_retiro_invalida';

  constructor() {
    super('El retiro no puede tener fecha futura.', { campo: 'fecha' });
  }
}

/** El retiro es de un monto positivo. */
export class MontoDeRetiroInvalido extends DatoInvalido {
  readonly codigo = 'monto_de_retiro_invalido';

  constructor() {
    super('Escriba el monto del retiro: debe ser mayor que cero.', { campo: 'monto' });
  }
}

/** El cheque del retiro lleva un nombre (el custodio o la empresa): nunca se emite al portador. */
export class BeneficiarioDelRetiroInvalido extends DatoInvalido {
  readonly codigo = 'beneficiario_del_retiro_invalido';

  constructor() {
    super('Escriba a nombre de quién va el cheque (el custodio o la empresa); no se emite al portador.', {
      campo: 'beneficiario',
    });
  }
}

/** El retiro dice quién lleva el efectivo: un nombre o un usuario de la empresa. */
export class CustodioObligatorio extends DatoInvalido {
  readonly codigo = 'custodio_obligatorio';

  constructor() {
    super('Escriba quién lleva el efectivo (hasta 150 letras) o escoja un usuario.', { campo: 'custodio' });
  }
}

/** El usuario escogido como custodio debe estar activo y entrar a la empresa. */
export class CustodioInvalido extends DatoInvalido {
  readonly codigo = 'custodio_invalido';

  constructor() {
    super('Ese usuario no está activo o no entra a esta empresa.', { campo: 'custodioUsuarioId' });
  }
}

/** Un retiro con pagos vigentes no se anula: primero se anulan esos pagos. */
export class RetiroConPagos extends ReglaDeNegocioInfringida {
  readonly codigo = 'retiro_con_pagos';

  constructor(numero: string, pagos: readonly string[]) {
    super(`El retiro ${numero} tiene los pagos ${pagos.join(', ')}: anúlelos primero.`);
  }
}

/** Un retiro liquidado no se anula ni se paga: primero se reabre. */
export class RetiroLiquidado extends ReglaDeNegocioInfringida {
  readonly codigo = 'retiro_liquidado';

  constructor(numero: string) {
    super(`El retiro ${numero} ya se liquidó: reábralo primero.`);
  }
}

/** Si el banco ya pagó el cheque (está conciliado), el efectivo se deposita y el retiro se liquida; no se anula. */
export class RetiroCobrado extends ReglaDeNegocioInfringida {
  readonly codigo = 'retiro_cobrado';

  constructor(numero: string) {
    super(`El banco ya pagó el cheque del retiro ${numero}: deposite el efectivo y liquide el retiro.`);
  }
}

export class RetiroYaAnulado extends ReglaDeNegocioInfringida {
  readonly codigo = 'retiro_ya_anulado';

  constructor(numero: string) {
    super(`El retiro ${numero} ya está anulado.`);
  }
}

export class RetiroNoLiquidado extends ReglaDeNegocioInfringida {
  readonly codigo = 'retiro_no_liquidado';

  constructor(numero: string) {
    super(`El retiro ${numero} no está liquidado.`);
  }
}

/** Lo que Cuentas por pagar emitió para un retiro no se corrige ni se elimina en Bancos. */
export class MovimientoDeUnRetiro extends ReglaDeNegocioInfringida {
  readonly codigo = 'movimiento_de_cuentas_por_pagar';

  constructor(numero: string) {
    super(`Lo emitió Cuentas por pagar (retiro ${numero}): anule o reabra el retiro desde allá.`);
  }
}

/** Lo devuelto más lo que falta es lo que no se pagó del retiro. */
export class LiquidacionNoCuadra extends DatoInvalido {
  readonly codigo = 'liquidacion_no_cuadra';

  constructor(sobranteCentavos: number) {
    super(`Lo devuelto más lo que falta debe ser ${quetzales(sobranteCentavos)} (lo que no se pagó).`, {
      campo: 'devuelto',
    });
  }
}

export class MotivoDeFaltanteObligatorio extends DatoInvalido {
  readonly codigo = 'motivo_de_faltante_obligatorio';

  constructor() {
    super('Escriba por qué falta efectivo.', { campo: 'motivoDeFaltante' });
  }
}

export class FechaDeLiquidacionInvalida extends DatoInvalido {
  readonly codigo = 'fecha_de_liquidacion_invalida';

  constructor(minima: string) {
    super(`La fecha no puede ser futura ni anterior al ${fechaLegible(minima)}.`, { campo: 'fecha' });
  }
}
