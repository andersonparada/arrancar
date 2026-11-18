import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';

/** Falta el saldo final que muestra el estado de cuenta del banco. */
export class FaltaElSaldoDelEstadoDeCuenta extends DatoInvalido {
  readonly codigo = 'falta_el_saldo_del_estado_de_cuenta';

  /** @param previa si es una conciliación elaborada antes de que se pidiera el saldo: hay que devolverla. */
  constructor(previa = false) {
    super(
      previa
        ? 'Escriba el saldo final que muestra el estado de cuenta del banco. Devuélvala para que quien la elaboró lo transcriba.'
        : 'Escriba el saldo final que muestra el estado de cuenta del banco.',
    );
  }
}

/** `12270.5` como «Q 12,270.50», igual que la pantalla. */
const enQuetzales = (monto: string): string =>
  `Q ${Number(monto).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** El saldo transcrito del estado de cuenta no es el que calculan las marcas. */
export class SaldoDelEstadoDeCuentaNoCoincide extends ReglaDeNegocioInfringida {
  readonly codigo = 'saldo_del_estado_de_cuenta_no_coincide';

  constructor(transcrito: string, calculado: string, diferencia: string) {
    super(
      `El saldo del estado de cuenta (${enQuetzales(transcrito)}) no coincide con el calculado (${enQuetzales(calculado)}); revise las marcas o registre la nota que falte.`,
      { transcrito, calculado, diferencia },
    );
  }
}

/** La empresa exige el estado de cuenta (PDF o foto) para terminar y no se adjuntó. */
export class FaltaElEstadoDeCuenta extends DatoInvalido {
  readonly codigo = 'falta_el_estado_de_cuenta';

  constructor() {
    super('Adjunte el estado de cuenta (PDF o foto) para terminar.');
  }
}
