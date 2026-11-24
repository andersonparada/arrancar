import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import {
  CargaInicialCerrada,
  MetodoDeCosteoSinElegir,
  SaldoInicialSinFechaDeInicio,
  SaldosConCierres,
} from '../../../dominio/errores-de-saldo-inicial.js';
import type { DependenciasDelKardex } from '../../kardex/dependencias-del-kardex.js';

/**
 * Los saldos iniciales solo se tocan con la fecha de inicio puesta, la carga **abierta** y ningún cierre de inventario
 * (§8). La pregunta a Empresas toma un bloqueo compartido de la carga: quien intente cerrarla espera a que esta
 * transacción termine. Devuelve la fecha de inicio.
 * @throws SaldoInicialSinFechaDeInicio, CargaInicialCerrada, SaldosConCierres.
 */
export async function exigirCargaAbierta(
  entorno: Pick<DependenciasDelKardex, 'cargaInicial' | 'cierres'>,
  operador: Operador,
): Promise<string> {
  const { fechaDeInicio, cerrada } = await entorno.cargaInicial.obtener(operador);
  if (!fechaDeInicio) throw new SaldoInicialSinFechaDeInicio();
  if (cerrada) throw new CargaInicialCerrada();
  if (await entorno.cierres.hayAlguno()) throw new SaldosConCierres();
  return fechaDeInicio;
}

/**
 * El método de costeo debe estar elegido antes del primer saldo inicial (§3.3): la pantalla lo pregunta si falta.
 * @throws MetodoDeCosteoSinElegir si nadie lo eligió.
 */
export async function exigirMetodoElegido(entorno: Pick<DependenciasDelKardex, 'metodos'>): Promise<void> {
  if ((await entorno.metodos.listar()).length === 0) throw new MetodoDeCosteoSinElegir();
}
