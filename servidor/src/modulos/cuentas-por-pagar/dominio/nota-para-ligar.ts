import { FechaDeAplicacionInvalida, MovimientoNoLigable, PagoMayorQueLaNota } from './errores-de-registro-de-pago.js';

/** Una nota de débito de Bancos tal como Cuentas por pagar la necesita para ligarla a un pago. */
export interface NotaParaLigar {
  movimientoId: string;
  cuentaBancariaId: string;
  /** `AAAA-MM-DD`. */
  fecha: string;
  montoCentavos: number;
  /** El correlativo de la nota; nulo si Bancos no le dio uno. */
  numero: number | null;
  beneficiario: string | null;
  /** Es una nota de débito suelta, vigente y marcada para Cuentas por pagar. */
  ligable: boolean;
}

/** Cómo se nombra la nota en los mensajes. */
export const nombreDeLaNota = ({ numero }: Pick<NotaParaLigar, 'numero'>): string =>
  numero === null ? 'sin número' : `N° ${numero}`;

/**
 * La nota existe en la empresa, es de débito, está vigente y marcada para Cuentas por pagar.
 * @throws MovimientoNoLigable
 */
export function exigirNotaLigable(nota: NotaParaLigar | null): asserts nota is NotaParaLigar {
  if (nota === null || !nota.ligable) throw new MovimientoNoLigable();
}

/** Lo que queda de la nota por aplicar: su monto menos lo de los pagos vigentes que la ligan. */
export const disponibleDeLaNota = (montoCentavos: number, ligadoCentavos: number): number =>
  montoCentavos - ligadoCentavos;

/** @throws PagoMayorQueLaNota si el pago pasa de lo que le queda a la nota. */
export function exigirQueCabeEnLaNota(
  nota: Pick<NotaParaLigar, 'numero'>,
  { disponibleCentavos, montoCentavos }: { disponibleCentavos: number; montoCentavos: number },
): void {
  if (montoCentavos > disponibleCentavos) throw new PagoMayorQueLaNota(nombreDeLaNota(nota), disponibleCentavos);
}

/** La fecha de aplicar la nota: por omisión hoy; no futura ni anterior a `minima` (la mayor entre la nota y los documentos). */
export function exigirFechaDeLaAplicacion(fecha: string, { minima, hoy }: { minima: string; hoy: string }): void {
  if (fecha < minima || fecha > hoy) throw new FechaDeAplicacionInvalida(minima);
}
