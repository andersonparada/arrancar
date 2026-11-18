import { aCentavos, deCentavos } from '../retenciones/dinero';

/**
 * El criterio de lo que se registra, único para la barra de marcados y para «Confirmar»: un DTE anulado en la SAT no se
 * registra, una nota de crédito resta y una de débito suma.
 */
export const esNotaDeCredito = (tipoDte: string | undefined): boolean => tipoDte === 'NCRE';
export const esNotaDeDebito = (tipoDte: string | undefined): boolean => tipoDte === 'NDEB';

/** Un DTE anulado en la SAT no se puede registrar; lo demás lo decide el servidor al calcular. */
export const seRegistraSegunLaSat = (estadoSat: string): boolean => estadoSat !== 'anulado';

/** El monto en centavos con el signo del documento: una nota de crédito resta aunque llegue en positivo o negativo. */
export function centavosConSigno(monto: string, tipoDte: string | undefined): number {
  const centavos = aCentavos(monto) ?? 0;
  return esNotaDeCredito(tipoDte) ? -Math.abs(centavos) : centavos;
}

/** Suma con signo, como texto con dos decimales. */
export const totalConSigno = (documentos: readonly { total: string; tipoDte: string | undefined }[]): string =>
  deCentavos(documentos.reduce((suma, { total, tipoDte }) => suma + centavosConSigno(total, tipoDte), 0));

/** Cuántos documentos hay de cada clase; las facturas son todo lo que no es nota. */
export function clasesDeDocumentos(tipos: readonly (string | undefined)[]) {
  const notasDeCredito = tipos.filter(esNotaDeCredito).length;
  const notasDeDebito = tipos.filter(esNotaDeDebito).length;
  return { notasDeCredito, notasDeDebito, facturas: tipos.length - notasDeCredito - notasDeDebito };
}
