import type { ResumenDeSaldoInicial } from '../../servicios/tipos-de-saldos-iniciales';
import { aCentavos, deCentavos } from '../comunes/centavos';

/** Lo que la fórmula necesita del resumen que manda el servidor. */
type PartesDelCuadre = Pick<
  ResumenDeSaldoInicial,
  | 'saldoSegunEstadoDeCuenta'
  | 'totalDepositosEnTransito'
  | 'totalChequesEnCirculacion'
  | 'totalDebitosEnTransito'
  | 'totalErroresDelBanco'
>;

/**
 * El saldo en libros al corte según la fórmula, en centavos enteros. Solo sirve para mostrar y comprobar a la vista:
 * el servidor manda su propio total y es el que vale.
 */
export function saldoEnLibrosPorFormula(partes: PartesDelCuadre): string {
  const centavos =
    aCentavos(partes.saldoSegunEstadoDeCuenta ?? '0') +
    aCentavos(partes.totalDepositosEnTransito) -
    aCentavos(partes.totalChequesEnCirculacion) -
    aCentavos(partes.totalDebitosEnTransito) +
    aCentavos(partes.totalErroresDelBanco);
  return deCentavos(centavos);
}

/** Cómo está una cuenta frente a los libros anteriores. */
export type SituacionDelCuadre = 'sin_saldo' | 'sin_dato' | 'cuadra' | 'no_cuadra';

export function situacionDelCuadre(
  resumen: Pick<ResumenDeSaldoInicial, 'forma' | 'saldoSegunLibrosAnteriores' | 'cuadra'>,
): SituacionDelCuadre {
  if (resumen.forma === 'sin_saldo') return 'sin_saldo';
  if (resumen.saldoSegunLibrosAnteriores === null) return 'sin_dato';
  return resumen.cuadra ? 'cuadra' : 'no_cuadra';
}

export const ROTULO_DE_SITUACION: Record<SituacionDelCuadre, string> = {
  sin_saldo: 'Sin saldo inicial',
  sin_dato: 'Falta el saldo de los libros anteriores',
  cuadra: 'Cuadra',
  no_cuadra: 'No cuadra',
};

/** Una línea de la fórmula del cuadre: el signo con que entra y su monto. */
export interface LineaDeLaFormula {
  clave: string;
  etiqueta: string;
  signo: '+' | '−' | '±' | '=';
  monto: string;
}

const esCero = (monto: string): boolean => aCentavos(monto) === 0;

/**
 * Las líneas de la fórmula, de arriba abajo, hasta el saldo en libros. Las que valen cero se omiten (menos el saldo del
 * banco y el resultado), para que en el celular no haya renglones vacíos. El saldo «de antes» (global) no tiene partes.
 */
export function lineasDeLaFormula(resumen: ResumenDeSaldoInicial): LineaDeLaFormula[] {
  const resultado: LineaDeLaFormula = {
    clave: 'libros',
    etiqueta: 'Saldo en libros al corte',
    signo: '=',
    monto: resumen.saldoEnLibrosAlCorte,
  };
  if (resumen.forma !== 'con_partidas') return [resultado];
  const partes: LineaDeLaFormula[] = [
    {
      clave: 'banco',
      etiqueta: 'Saldo según el estado de cuenta',
      signo: '+',
      monto: resumen.saldoSegunEstadoDeCuenta ?? '0.00',
    },
    { clave: 'depositos', etiqueta: 'Depósitos en tránsito', signo: '+', monto: resumen.totalDepositosEnTransito },
    { clave: 'cheques', etiqueta: 'Cheques en circulación', signo: '−', monto: resumen.totalChequesEnCirculacion },
    { clave: 'debitos', etiqueta: 'Débitos en tránsito', signo: '−', monto: resumen.totalDebitosEnTransito },
    { clave: 'errores', etiqueta: 'Errores del banco', signo: '±', monto: resumen.totalErroresDelBanco },
  ];
  return [...partes.filter((linea) => linea.clave === 'banco' || !esCero(linea.monto)), resultado];
}

/** La diferencia con los libros anteriores es de sobregiro (negativa) o de saldo (positiva): para decirlo en palabras. */
export function textoDeLaDiferencia(diferencia: string | null): string {
  if (diferencia === null) return '';
  const centavos = aCentavos(diferencia);
  if (centavos === 0) return 'Sin diferencia';
  return centavos > 0
    ? 'Arrancar tiene más que los libros anteriores'
    : 'Arrancar tiene menos que los libros anteriores';
}
