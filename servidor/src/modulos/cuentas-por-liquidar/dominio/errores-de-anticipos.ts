import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';
import { fechaLegible } from './fechas.js';

/** El dinero ya salió del banco: el anticipo no puede tener fecha futura. */
export class FechaDelAnticipoInvalida extends DatoInvalido {
  readonly codigo = 'fecha_del_anticipo_invalida';

  constructor() {
    super('El anticipo no puede tener fecha futura.', { campo: 'fecha' });
  }
}

export class FechaLimiteInvalida extends DatoInvalido {
  readonly codigo = 'fecha_limite_invalida';

  constructor(fecha: string) {
    super(`La fecha límite no puede ser anterior a la entrega (${fechaLegible(fecha)}).`, { campo: 'fechaLimite' });
  }
}

export class MontoDelAnticipoInvalido extends DatoInvalido {
  readonly codigo = 'monto_del_anticipo_invalido';

  constructor() {
    super('Escriba el monto del anticipo: debe ser mayor que cero.', { campo: 'monto' });
  }
}

/** El cheque lleva el nombre del beneficiario: nunca se emite al portador. */
export class BeneficiarioDelAnticipoInvalido extends DatoInvalido {
  readonly codigo = 'beneficiario_del_anticipo_invalido';

  constructor() {
    super('El cheque del anticipo va a nombre del beneficiario; no se emite al portador.', {
      campo: 'beneficiarioId',
    });
  }
}

/** El beneficiario es un tercero de la cuenta y debe estar activo. */
export class BeneficiarioNoDisponible extends DatoInvalido {
  readonly codigo = 'beneficiario_no_disponible';

  constructor() {
    super('Escoja un tercero activo de la cuenta como beneficiario.', { campo: 'beneficiarioId' });
  }
}

/** El usuario escogido como beneficiario debe estar activo y entrar a la empresa. */
export class BeneficiarioUsuarioInvalido extends DatoInvalido {
  readonly codigo = 'beneficiario_usuario_invalido';

  constructor() {
    super('Ese usuario no está activo o no entra a esta empresa.', { campo: 'beneficiarioUsuarioId' });
  }
}

export class LocalidadDelAnticipoInvalida extends DatoInvalido {
  readonly codigo = 'localidad_del_anticipo_invalida';

  constructor() {
    super('Escoja una localidad de esta empresa.', { campo: 'localidadId' });
  }
}

/** Con el bloqueo encendido, entregar a quien tiene anticipos vencidos pide el permiso de excepción. */
export class BeneficiarioConVencidos extends ReglaDeNegocioInfringida {
  readonly codigo = 'beneficiario_con_vencidos';

  constructor(beneficiario: string, numeros: readonly string[]) {
    super(
      `${beneficiario} tiene anticipos vencidos sin liquidar (${numeros.join(', ')}): para entregarle otro hace falta el permiso de excepción.`,
    );
  }
}

export class MotivoConVencidosObligatorio extends DatoInvalido {
  readonly codigo = 'motivo_con_vencidos_obligatorio';

  constructor() {
    super('Escriba por qué se le entrega otro anticipo a quien tiene vencidos (hasta 300 letras).', {
      campo: 'motivoConVencidos',
    });
  }
}

export class MotivoInvalido extends DatoInvalido {
  readonly codigo = 'motivo_invalido';

  constructor() {
    super('Escriba el motivo (hasta 300 letras).', { campo: 'motivo' });
  }
}

export class AnticipoYaAnulado extends ReglaDeNegocioInfringida {
  readonly codigo = 'anticipo_ya_anulado';

  constructor(numero: string) {
    super(`El anticipo ${numero} ya está anulado.`);
  }
}

/** Un anticipo liquidado no se anula: primero se reabre. */
export class AnticipoLiquidado extends ReglaDeNegocioInfringida {
  readonly codigo = 'anticipo_liquidado';

  constructor(numero: string) {
    super(`El anticipo ${numero} ya se liquidó: reábralo primero.`);
  }
}

/** Con gastos vigentes el anticipo no se anula: primero se quitan los gastos. */
export class AnticipoConGastos extends ReglaDeNegocioInfringida {
  readonly codigo = 'anticipo_con_gastos';

  constructor(numero: string) {
    super(`El anticipo ${numero} tiene gastos: quítelos primero.`);
  }
}

/** Si el banco ya pagó el cheque (está conciliado), el anticipo se liquida; no se anula. */
export class AnticipoCobrado extends ReglaDeNegocioInfringida {
  readonly codigo = 'anticipo_cobrado';

  constructor(numero: string) {
    super(`El banco ya pagó el cheque del anticipo ${numero}: no se puede anular, liquídelo.`);
  }
}

/** Lo que Cuentas por liquidar registró en Bancos no se corrige ni se elimina allá. */
export class MovimientoDeCuentasPorLiquidar extends ReglaDeNegocioInfringida {
  readonly codigo = 'movimiento_de_cuentas_por_liquidar';

  constructor(numero: string) {
    super(`Lo registró Cuentas por liquidar (anticipo ${numero}): anule o reabra el anticipo desde allá.`);
  }
}
