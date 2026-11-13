import { aCentavos, deCentavos } from './centavos.js';
import { FaltaElSaldoDelEstadoDeCuenta, SaldoDelEstadoDeCuentaNoCoincide } from './errores-de-estado-de-cuenta.js';

/**
 * El saldo final que el usuario transcribe del estado de cuenta del banco. Solo se
 * compara con el calculado (nunca entra al cálculo); puede ser negativo (sobregiro).
 */
export class SaldoTranscrito {
  private constructor(private readonly centavos: number) {}

  /** @param texto el monto con hasta dos decimales, por ejemplo `"1250.50"`. */
  static desde(texto: string): SaldoTranscrito {
    return new SaldoTranscrito(aCentavos(texto));
  }

  /** Con dos decimales, como se guarda: `"1250.50"`. */
  get texto(): string {
    return deCentavos(this.centavos);
  }

  coincideCon(calculado: string): boolean {
    return this.centavos === aCentavos(calculado);
  }

  /** Calculado menos transcrito, con dos decimales. */
  diferenciaCon(calculado: string): string {
    return deCentavos(aCentavos(calculado) - this.centavos);
  }
}

/** Calculado menos transcrito, o `null` si todavía no hay saldo transcrito. */
export function diferenciaConElEstadoDeCuenta(saldo: string | null, calculado: string): string | null {
  return saldo === null ? null : SaldoTranscrito.desde(saldo).diferenciaCon(calculado);
}

/**
 * @param previa si la conciliación es anterior a que se pidiera el saldo (cambia el texto del error).
 * @throws FaltaElSaldoDelEstadoDeCuenta si no hay saldo transcrito.
 * @throws SaldoDelEstadoDeCuentaNoCoincide si difiere del calculado.
 */
export function exigirSaldoQueCoincide(saldo: string | null, calculado: string, previa = false): void {
  if (saldo === null) throw new FaltaElSaldoDelEstadoDeCuenta(previa);
  const transcrito = SaldoTranscrito.desde(saldo);
  if (transcrito.coincideCon(calculado)) return;
  throw new SaldoDelEstadoDeCuentaNoCoincide(
    transcrito.texto,
    deCentavos(aCentavos(calculado)),
    transcrito.diferenciaCon(calculado),
  );
}
