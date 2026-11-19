import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import {
  CargaInicialCerrada,
  SaldoInicialSinFechaDeInicio,
  SaldosConCierres,
} from '../../../dominio/errores-de-saldo-inicial.js';
import type { Cierres } from '../../puertos/cierres.js';
import type { ConsultasSaldosIniciales } from '../../puertos/consultas-saldos-iniciales.js';
import type { LectorDeTopes } from '../../puertos/lector-de-topes.js';
import type { RepositorioCostos } from '../../puertos/repositorio-costos.js';
import type { RepositorioSaldosIniciales } from '../../puertos/repositorio-saldos-iniciales.js';
import type { RepositorioTramos } from '../../puertos/repositorio-tramos.js';
import type { DependenciasDeActivos } from '../activos/dependencias-de-activos.js';

/** Lo que usan los casos de uso de los saldos iniciales: lo de los activos más sus montos, costos, tramos y cierres. */
export interface DependenciasDeSaldosIniciales extends Pick<
  DependenciasDeActivos,
  | 'unidadDeTrabajo'
  | 'repositorio'
  | 'clases'
  | 'auditoria'
  | 'ubicaciones'
  | 'cargaInicial'
  | 'correlativos'
  | 'prefijo'
  | 'reloj'
> {
  saldos: RepositorioSaldosIniciales;
  consultas: ConsultasSaldosIniciales;
  costos: RepositorioCostos;
  tramos: RepositorioTramos;
  cierres: Cierres;
  topes: LectorDeTopes;
}

/**
 * Los saldos iniciales solo se escriben con la carga abierta y sin ningún cierre de depreciación (§8). Toma el candado
 * compartido del cierre y, con la lectura de la carga, el bloqueo de su fila: nadie cierra la carga ni un mes mientras
 * se escribe. Devuelve la fecha de inicio de la empresa.
 * @throws SaldoInicialSinFechaDeInicio, CargaInicialCerrada o SaldosConCierres si no se puede escribir.
 */
export async function exigirCargaAbierta(
  { cargaInicial, cierres }: Pick<DependenciasDeSaldosIniciales, 'cargaInicial' | 'cierres'>,
  operador: Operador,
): Promise<string> {
  await cierres.bloquear('compartido');
  const { fechaDeInicio, cerrada } = await cargaInicial.obtener(operador);
  if (!fechaDeInicio) throw new SaldoInicialSinFechaDeInicio();
  if (cerrada) throw new CargaInicialCerrada();
  if (await cierres.ultimoMesCerrado()) throw new SaldosConCierres();
  return fechaDeInicio;
}
