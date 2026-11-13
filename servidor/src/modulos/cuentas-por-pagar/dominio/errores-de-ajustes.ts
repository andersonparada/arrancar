import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';
import { fechaLegible, quetzales } from './avisos.js';

export class AjusteMayorQueElSaldoLibre extends DatoInvalido {
  readonly codigo = 'ajuste_mayor_que_el_saldo_libre';

  constructor(etiqueta: string, saldoLibreCentavos: number) {
    super(`La nota ${etiqueta} solo tiene ${quetzales(saldoLibreCentavos)} a favor.`, { campo: 'monto' });
  }
}

export class MontoDeAjusteInvalido extends DatoInvalido {
  readonly codigo = 'monto_de_ajuste_invalido';

  constructor() {
    super('El monto a ajustar debe ser mayor que cero.', { campo: 'monto' });
  }
}

/** Una nota que aún está en la bandeja no se ajusta: primero se completa. */
export class NotaPendienteNoSeAjusta extends ReglaDeNegocioInfringida {
  readonly codigo = 'nota_pendiente_no_se_ajusta';

  constructor(etiqueta: string) {
    super(`La nota ${etiqueta} está pendiente en la bandeja: complétela antes de ajustar su saldo a favor.`);
  }
}

export class DiferenciaMenorSobreElTope extends DatoInvalido {
  readonly codigo = 'diferencia_menor_sobre_el_tope';

  constructor(topeCentavos: number) {
    super(
      `Una diferencia menor llega hasta ${quetzales(topeCentavos)} (configuración de la empresa); para más, elija otra causa.`,
      { campo: 'monto' },
    );
  }
}

export class ReferenciaObligatoria extends DatoInvalido {
  readonly codigo = 'referencia_obligatoria';

  constructor() {
    super('Escriba con qué se compensó (factura de venta, recibo o acuerdo).', { campo: 'referencia' });
  }
}

export class FechaDeAjusteInvalida extends DatoInvalido {
  readonly codigo = 'fecha_de_ajuste_invalida';

  /** `minima` es nula si nada la limita (solo cuenta que no sea futura). */
  constructor(minima: string | null) {
    const limite = minima ? ` ni anterior al ${fechaLegible(minima)} (recepción de la nota o fecha de inicio)` : '';
    super(`La fecha no puede ser futura${limite}.`, { campo: 'fecha' });
  }
}

export class CausaDeAjusteInvalida extends DatoInvalido {
  readonly codigo = 'causa_de_ajuste_invalida';

  constructor() {
    super('Escoja la causa del ajuste.', { campo: 'causa' });
  }
}

export class AjusteYaAnulado extends ReglaDeNegocioInfringida {
  readonly codigo = 'ajuste_ya_anulado';

  constructor() {
    super('Ese ajuste ya está anulado.');
  }
}
