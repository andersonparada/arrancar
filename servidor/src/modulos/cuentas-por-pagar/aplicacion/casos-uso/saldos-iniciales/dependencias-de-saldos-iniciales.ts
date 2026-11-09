import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { Reloj } from '../../../../core/compartido/aplicacion/reloj.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { DocumentoConAplicaciones } from '../../../dominio/documento-por-pagar.js';
import {
  CargaInicialCerradaParaSaldos,
  FechaDeInicioSinRegistrar,
} from '../../../dominio/errores-de-saldos-iniciales.js';
import { dtoDeSaldoInicial } from '../../dto/dto-de-saldo-inicial.js';
import type { SaldoInicialDto } from '../../dto/saldo-inicial.dto.js';
import type {
  CondicionesDeProveedores,
  PlazoPorOmision,
  RepositorioDeDocumentos,
} from '../../puertos/puertos-de-documentos.js';
import type { ConsultasDeDocumentos } from '../../puertos/puertos-de-consultas.js';
import type {
  CargaInicial,
  ProveedoresParaSaldos,
  RepositorioDeSaldosIniciales,
} from '../../puertos/puertos-de-saldos-iniciales.js';

/** Lo que necesitan los casos de uso de saldos iniciales. */
export interface DependenciasDeSaldosIniciales {
  unidadDeTrabajo: UnidadDeTrabajo;
  documentos: RepositorioDeDocumentos;
  saldosIniciales: RepositorioDeSaldosIniciales;
  consultas: ConsultasDeDocumentos;
  cargaInicial: CargaInicial;
  proveedores: ProveedoresParaSaldos;
  condiciones: CondicionesDeProveedores;
  plazo: PlazoPorOmision;
  auditoria: Auditoria;
  reloj: Reloj;
}

/** Lo que necesitan listar y obtener. */
export type DependenciasDeConsultaDeSaldos = Pick<
  DependenciasDeSaldosIniciales,
  'unidadDeTrabajo' | 'consultas' | 'cargaInicial' | 'reloj'
>;

/** El recurso con que se audita y con que se nombran los permisos. */
export const RECURSO_DE_SALDOS_INICIALES = 'cuentas-por-pagar.saldos-iniciales';

/**
 * Pide la carga inicial de la empresa (con bloqueo compartido) y exige que se pueda cargar: con fecha de inicio y abierta.
 * @returns la fecha de inicio, `AAAA-MM-DD`.
 * @throws FechaDeInicioSinRegistrar, CargaInicialCerradaParaSaldos
 */
export async function exigirCargaAbierta(cargaInicial: CargaInicial, operador: Operador): Promise<string> {
  const { fechaDeInicio, cerrada } = await cargaInicial.obtener(operador);
  if (fechaDeInicio === null) throw new FechaDeInicioSinRegistrar();
  if (cerrada) throw new CargaInicialCerradaParaSaldos();
  return fechaDeInicio;
}

/**
 * La fila del saldo inicial, bloqueada para este caso de uso.
 * @throws RecursoNoEncontrado si no existe, es de otra empresa o es un documento de Libro de compras.
 */
export async function bloquearSaldoInicial(
  documentos: RepositorioDeDocumentos,
  id: string,
): Promise<DocumentoConAplicaciones> {
  const guardado = await documentos.buscarPorId(id, true);
  if (guardado?.documento.origen !== 'saldo_inicial') throw new RecursoNoEncontrado('El saldo inicial');
  return guardado;
}

/**
 * El saldo inicial como lo ve la ventana, con la carga abierta o cerrada según se indique.
 * @throws RecursoNoEncontrado si no existe o es un documento de Libro de compras.
 */
export async function dtoDelSaldoInicial(
  consultas: ConsultasDeDocumentos,
  id: string,
  cargaCerrada: boolean,
): Promise<SaldoInicialDto> {
  const fila = await consultas.buscar(id);
  if (fila?.documento.origen !== 'saldo_inicial') throw new RecursoNoEncontrado('El saldo inicial');
  return dtoDeSaldoInicial(fila, cargaCerrada);
}
