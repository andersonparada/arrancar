import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';
import { fechaLegible, quetzales } from './avisos.js';

/** Un reintegro devuelve el saldo libre de una nota: nunca más de lo que la nota tiene a favor. */
export class ReintegroMayorQueElSaldoLibre extends DatoInvalido {
  readonly codigo = 'reintegro_mayor_que_el_saldo_libre';

  constructor(etiqueta: string, saldoLibreCentavos: number, indice: number) {
    super(`La nota ${etiqueta} solo tiene ${quetzales(saldoLibreCentavos)} a favor.`, {
      campo: `notas.${indice}.monto`,
    });
  }
}

export class MontoDeReintegroInvalido extends DatoInvalido {
  readonly codigo = 'monto_de_reintegro_invalido';

  constructor(indice: number) {
    super('El monto a reintegrar debe ser mayor que cero.', { campo: `notas.${indice}.monto` });
  }
}

export class ReintegroSinNotas extends DatoInvalido {
  readonly codigo = 'reintegro_sin_notas';

  constructor() {
    super('Escoja al menos una nota de crédito.', { campo: 'notas' });
  }
}

export class DemasiadasNotasEnReintegro extends DatoInvalido {
  readonly codigo = 'demasiadas_notas_en_reintegro';

  constructor(maximo: number) {
    super(`Un reintegro admite hasta ${maximo} notas de crédito.`, { campo: 'notas' });
  }
}

export class NotaRepetidaEnReintegro extends DatoInvalido {
  readonly codigo = 'nota_repetida_en_reintegro';

  constructor(indice: number) {
    super('La nota aparece dos veces: junte sus montos en una sola línea.', { campo: `notas.${indice}.notaId` });
  }
}

/** Todas las notas del reintegro son del proveedor que devuelve el dinero. */
export class NotaDeOtroProveedor extends DatoInvalido {
  readonly codigo = 'nota_de_otro_proveedor';

  constructor(etiqueta: string, indice: number) {
    super(`La nota ${etiqueta} no es de este proveedor.`, { campo: `notas.${indice}.notaId` });
  }
}

/** La fecha del reintegro no es futura ni anterior a la recepción de sus notas (o a la fecha de inicio). */
export class FechaDeReintegroInvalida extends DatoInvalido {
  readonly codigo = 'fecha_de_reintegro_invalida';

  /** `minima` es nula si nada la limita (solo cuenta que no sea futura). */
  constructor(minima: string | null) {
    super(
      minima ? `La fecha no puede ser futura ni anterior al ${fechaLegible(minima)}.` : 'La fecha no puede ser futura.',
      { campo: 'fecha' },
    );
  }
}

/** Un depósito se registra en una cuenta bancaria. */
export class CuentaDelDepositoObligatoria extends DatoInvalido {
  readonly codigo = 'cuenta_del_deposito_obligatoria';

  constructor() {
    super('Escoja la cuenta bancaria donde se depositó.', { campo: 'cuentaBancariaId' });
  }
}

/** En efectivo la referencia es el recibo de caja o la boleta: sin ella el cobro no deja rastro. */
export class ReferenciaDelReciboObligatoria extends DatoInvalido {
  readonly codigo = 'referencia_del_recibo_obligatoria';

  constructor() {
    super('Escriba el número del recibo de caja o de la boleta del efectivo recibido.', { campo: 'referencia' });
  }
}

export class ReferenciaDeReintegroInvalida extends DatoInvalido {
  readonly codigo = 'referencia_de_reintegro_invalida';

  constructor(maximo: number) {
    super(`La referencia admite hasta ${maximo} caracteres.`, { campo: 'referencia' });
  }
}

export class ReintegroYaAnulado extends ReglaDeNegocioInfringida {
  readonly codigo = 'reintegro_ya_anulado';

  constructor(numero: string) {
    super(`El reintegro ${numero} ya está anulado.`);
  }
}

/** Lo que registró un reintegro en Bancos no se corrige ni se elimina allá: se anula el reintegro desde Cuentas por pagar. */
export class MovimientoDeUnReintegro extends ReglaDeNegocioInfringida {
  readonly codigo = 'movimiento_de_un_reintegro';

  constructor(numero: string) {
    super(`Lo registró Cuentas por pagar (reintegro ${numero}): anule el reintegro desde allá.`);
  }
}

/** Un movimiento que tuvo un reintegro (hoy anulado) no se elimina en Bancos: la llave lo exige y el rastro se conserva. */
export class MovimientoConReintegroAnulado extends ReglaDeNegocioInfringida {
  readonly codigo = 'movimiento_con_reintegro_anulado';

  constructor() {
    super('Tuvo un reintegro en Cuentas por pagar: anúlelo en vez de eliminarlo.');
  }
}
