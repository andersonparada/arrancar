import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';
import { fechaLegible } from './avisos.js';

/** Con la carga inicial abierta, un saldo inicial sin movimientos se corrige o se elimina: no se da por pagado (§5.3). */
export class CorrijaElSaldoInicial extends ReglaDeNegocioInfringida {
  readonly codigo = 'corrija_el_saldo_inicial';

  constructor(etiqueta: string) {
    super(
      `La carga inicial está abierta y el saldo inicial ${etiqueta} no tiene movimientos: quítelo de la contraseña, desautorícelo y corríjalo o elimínelo en Saldos iniciales.`,
    );
  }
}

/** La fecha de una corrección de error no puede ser futura ni anterior a la fecha de inicio de la empresa. */
export class FechaDeAperturaInvalida extends DatoInvalido {
  readonly codigo = 'fecha_de_pago_invalida';

  constructor(fechaDeInicio: string | null) {
    const desde = fechaDeInicio === null ? '' : ` ni anterior al ${fechaLegible(fechaDeInicio)} (fecha de inicio)`;
    super(`La fecha no puede ser futura${desde}.`, { campo: 'fecha' });
  }
}
