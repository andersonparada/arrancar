import { aCentavos, deCentavos } from './centavos.js';
import type { ParteDeApertura } from './partes-de-apertura.js';

/** Lo que el cuadre necesita de cada partida vigente o anulada de la cuenta. */
export interface PartidaParaElCuadre {
  parte: ParteDeApertura;
  tipo: 'credito' | 'debito' | 'cheque';
  monto: string;
  /** Anulada a la antigua: ya no pesa. Una revertida sigue pesando (su inverso es un movimiento posterior al corte). */
  anulada: boolean;
}

/** El cuadre de una cuenta al corte (docs/modulos/diseno-bancos-segunda-parte.md §2.2); todo con dos decimales. */
export interface CuadreDeApertura {
  /** El saldo del estado de cuenta, con signo; nulo si la cuenta no lo tiene (sin saldo o saldo global). */
  saldoSegunEstadoDeCuenta: string | null;
  totalDepositosEnTransito: string;
  totalChequesEnCirculacion: string;
  totalDebitosEnTransito: string;
  /** Con signo: positivo suma al saldo en libros. */
  totalErroresDelBanco: string;
  saldoEnLibrosAlCorte: string;
  /** Informativo: cuenta en su fecha, no en el cuadre. */
  totalPosfechados: string;
}

const efecto = ({ tipo, monto }: PartidaParaElCuadre): number =>
  tipo === 'credito' ? aCentavos(monto) : -aCentavos(monto);

const sumaDe = (partidas: PartidaParaElCuadre[], parte: ParteDeApertura, conSigno = false): number =>
  partidas
    .filter((partida) => partida.parte === parte && !partida.anulada)
    .reduce((total, partida) => total + (conSigno ? efecto(partida) : aCentavos(partida.monto)), 0);

const ESTAS_PARTES_SON_EL_SALDO: ParteDeApertura[] = ['saldo_del_banco', 'saldo_global'];

/** El saldo en libros al corte es la suma del efecto de todas las partidas de apertura (el posfechado queda fuera). */
export function calcularCuadre(partidas: PartidaParaElCuadre[]): CuadreDeApertura {
  const delBanco = sumaDe(partidas, 'saldo_del_banco', true);
  const enLibros = partidas
    .filter((partida) => partida.parte !== 'cheque_posfechado' && !partida.anulada)
    .reduce((total, partida) => total + efecto(partida), 0);
  const tieneBanco = partidas.some((partida) => partida.parte === 'saldo_del_banco' && !partida.anulada);
  return {
    saldoSegunEstadoDeCuenta: tieneBanco ? deCentavos(delBanco) : null,
    totalDepositosEnTransito: deCentavos(sumaDe(partidas, 'deposito_en_transito')),
    totalChequesEnCirculacion: deCentavos(sumaDe(partidas, 'cheque_en_circulacion')),
    totalDebitosEnTransito: deCentavos(sumaDe(partidas, 'debito_en_transito')),
    totalErroresDelBanco: deCentavos(sumaDe(partidas, 'error_del_banco', true)),
    saldoEnLibrosAlCorte: deCentavos(enLibros),
    totalPosfechados: deCentavos(sumaDe(partidas, 'cheque_posfechado')),
  };
}

/** Si la cuenta tiene algún saldo principal (el del banco o el global de antes) vigente. */
export const tieneSaldoPrincipal = (partidas: PartidaParaElCuadre[]): boolean =>
  partidas.some((partida) => ESTAS_PARTES_SON_EL_SALDO.includes(partida.parte) && !partida.anulada);

/** La diferencia contra el saldo de la cuenta contable de los libros anteriores; sin ese dato no hay diferencia. */
export function compararConLibros(
  saldoEnLibrosAlCorte: string,
  saldoSegunLibrosAnteriores: string | null,
): { diferencia: string | null; cuadra: boolean } {
  if (saldoSegunLibrosAnteriores === null) return { diferencia: null, cuadra: false };
  const diferencia = aCentavos(saldoEnLibrosAlCorte) - aCentavos(saldoSegunLibrosAnteriores);
  return { diferencia: deCentavos(diferencia), cuadra: diferencia === 0 };
}

/**
 * Bancos y Sobregiros bancarios, sin compensar (NIIF para las Pymes 2.52): Bancos suma las cuentas con saldo positivo
 * y Sobregiros las negativas, en valor absoluto. No hay un total neto.
 */
export function totalesDeLaEmpresa(saldosEnLibros: string[]): { totalBancos: string; totalSobregiros: string } {
  const centavos = saldosEnLibros.map(aCentavos);
  const suma = (valores: number[]) => valores.reduce((total, valor) => total + valor, 0);
  return {
    totalBancos: deCentavos(suma(centavos.filter((valor) => valor > 0))),
    totalSobregiros: deCentavos(-suma(centavos.filter((valor) => valor < 0))),
  };
}
