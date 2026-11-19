import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { DocumentosProtegidos } from '../../../../core/compartido/aplicacion/documentos-protegidos.js';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { AperturaConConciliacion, SinSaldoInicial } from '../../../dominio/errores-de-apertura.js';
import {
  PARTES_QUE_SE_AGREGAN,
  type ParteDeApertura,
  type ParteQueSeAgrega,
} from '../../../dominio/partes-de-apertura.js';
import type { ArmadorDePartidas } from '../../armador-de-partidas.js';
import type { ChequesDeApertura } from '../../cheques-de-apertura.js';
import { exigirCargaAbierta, type FichaDeSaldoInicial } from '../../ficha-de-saldo-inicial.js';
import type { PartidaDeAperturaDto } from '../../dto/saldo-inicial.dto.js';
import type { CargaInicial } from '../../puertos/carga-inicial.js';
import type { ConsultasConciliaciones } from '../../puertos/consultas-conciliaciones.js';
import type { ConsultasDeSaldosIniciales, PartidaDeLaBase } from '../../puertos/consultas-de-saldos-iniciales.js';
import type {
  CabeceraDeSaldoInicial,
  RepositorioDeSaldosIniciales,
} from '../../puertos/repositorio-de-saldos-iniciales.js';
import type { RepositorioMovimientos } from '../../puertos/repositorio-movimientos.js';
import type { ReglasDeLaCuenta } from '../../reglas-de-la-cuenta.js';

/** Lo que usan los casos de uso de los saldos iniciales. */
export interface DependenciasDeSaldosIniciales {
  unidadDeTrabajo: UnidadDeTrabajo;
  auditoria: Auditoria;
  cargaInicial: CargaInicial;
  cabeceras: RepositorioDeSaldosIniciales;
  consultas: ConsultasDeSaldosIniciales;
  consultasConciliaciones: ConsultasConciliaciones;
  repositorioMovimientos: RepositorioMovimientos;
  reglas: ReglasDeLaCuenta;
  ficha: FichaDeSaldoInicial;
  armador: ArmadorDePartidas;
  chequesDeApertura: ChequesDeApertura;
  documentos: DocumentosProtegidos;
}

/** La cuenta lista para cambiar su apertura: la carga abierta, la cuenta bloqueada y su cabecera, si la tiene. */
export interface EscrituraAbierta {
  corte: string;
  cabecera: CabeceraDeSaldoInicial | null;
  cuentaActiva: boolean;
}

/**
 * Prepara cualquier cambio de la apertura, en el orden de bloqueo del diseño: la carga inicial (que toma el bloqueo
 * compartido), la cuenta bancaria y su cabecera.
 * @throws SinFechaDeInicio, CargaInicialCerrada, RecursoNoEncontrado si la cuenta no es de la empresa.
 */
export async function abrirEscritura(
  dependencias: DependenciasDeSaldosIniciales,
  operador: Operador,
  cuentaBancariaId: string,
): Promise<EscrituraAbierta> {
  const corte = await exigirCargaAbierta(dependencias.cargaInicial, operador);
  const { activa } = await dependencias.cabeceras.bloquearCuenta(cuentaBancariaId);
  const cabecera = await dependencias.cabeceras.buscarDeLaCuenta(cuentaBancariaId);
  return { corte, cabecera, cuentaActiva: activa };
}

const mesLegible = ({ anio, mes }: { anio: number; mes: number }) => `${String(mes).padStart(2, '0')}/${anio}`;

/** @throws AperturaConConciliacion si la cuenta tiene alguna conciliación, de cualquier estado. */
export async function exigirSinConciliaciones(
  conciliaciones: ConsultasConciliaciones,
  cuentaBancariaId: string,
): Promise<void> {
  const [reciente] = await conciliaciones.listar(cuentaBancariaId);
  if (reciente) throw new AperturaConConciliacion(mesLegible(reciente));
}

/**
 * La cuenta ya tiene su saldo según el estado de cuenta (la cabecera, con el movimiento del banco o, si el saldo es
 * cero, sin él). Un saldo global de antes todavía no lo es: se convierte primero.
 * @throws SinSaldoInicial si la cuenta solo tiene el saldo global.
 */
export async function exigirSaldoDelBanco(
  consultas: ConsultasDeSaldosIniciales,
  cuentaBancariaId: string,
): Promise<void> {
  const principales = await consultas.saldosPrincipales();
  const esGlobal = principales.some((p) => p.cuentaBancariaId === cuentaBancariaId && p.parte === 'saldo_global');
  if (esGlobal) throw new SinSaldoInicial();
}

/** La partida de la ficha de la cuenta. @throws RecursoNoEncontrado si no existe en esa cuenta. */
export async function partidaDeLaCuenta(
  { ficha }: Pick<DependenciasDeSaldosIniciales, 'ficha'>,
  operador: Operador,
  { cuentaBancariaId, movimientoId }: { cuentaBancariaId: string; movimientoId: string },
): Promise<PartidaDeAperturaDto> {
  const partida = (await ficha.deLaCuenta(operador, cuentaBancariaId)).partidas.find(
    (candidata) => candidata.movimientoId === movimientoId,
  );
  if (!partida) throw new RecursoNoEncontrado('La partida');
  return partida;
}

/** Una partida de las que se agregan a mano, como está en la base y como la ve la pantalla. */
export interface PartidaPorCambiar {
  base: PartidaDeLaBase & { parte: ParteQueSeAgrega };
  dto: PartidaDeAperturaDto;
}

const seAgregaAMano = (parte: ParteDeApertura): parte is ParteQueSeAgrega =>
  (PARTES_QUE_SE_AGREGAN as readonly string[]).includes(parte);

/**
 * La partida que se corrige o se elimina. El saldo del banco y el global no son partidas sueltas: se cambian con su
 * cabecera.
 * @throws RecursoNoEncontrado si no existe en esa cuenta o no es una partida de las que se agregan.
 */
export async function partidaPorCambiar(
  dependencias: DependenciasDeSaldosIniciales,
  operador: Operador,
  ids: { cuentaBancariaId: string; movimientoId: string },
): Promise<PartidaPorCambiar> {
  const base = (await dependencias.consultas.partidas(ids.cuentaBancariaId)).find(
    (candidata) => candidata.movimientoId === ids.movimientoId,
  );
  if (!base || !seAgregaAMano(base.parte)) throw new RecursoNoEncontrado('La partida');
  return { base: { ...base, parte: base.parte }, dto: await partidaDeLaCuenta(dependencias, operador, ids) };
}

export const RECURSO_DE_SALDOS_INICIALES = 'bancos.saldos-iniciales';
export const RECURSO_DE_PARTIDAS = 'bancos.movimientos';
