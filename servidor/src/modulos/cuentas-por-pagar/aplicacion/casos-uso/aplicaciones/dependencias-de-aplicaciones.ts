import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Reloj } from '../../../../core/compartido/aplicacion/reloj.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { saldoDe } from '../../../dominio/saldos.js';
import { aplicadoDe } from '../../dto/dto-de-documento-por-pagar.js';
import type { ConsultasDeDocumentos, FilaDeDocumento } from '../../puertos/puertos-de-consultas.js';
import type {
  FechasDeEntrada,
  RepositorioDeAplicaciones,
  RepositorioDeDocumentos,
  UmbralDeBancarizacion,
} from '../../puertos/puertos-de-documentos.js';
import type { TopeDeDiferenciaMenor } from '../../puertos/puertos-de-ajustes.js';
import type { CargaInicial } from '../../puertos/puertos-de-saldos-iniciales.js';

/** El recurso con que se audita quitar una aplicación. */
export const RECURSO_DE_APLICACIONES = 'cuentas-por-pagar.aplicaciones-de-notas';

/** Lo que necesita aplicar el saldo libre de una nota a mano. */
export interface DependenciasDeAplicaciones {
  unidadDeTrabajo: UnidadDeTrabajo;
  documentos: RepositorioDeDocumentos;
  consultas: ConsultasDeDocumentos;
  aplicaciones: RepositorioDeAplicaciones;
  cargaInicial: CargaInicial;
  fechasDeEntrada: FechasDeEntrada;
  /** Para la ficha que devuelve. */
  topeDeDiferencia: TopeDeDiferenciaMenor;
  reloj: Reloj;
}

/** Lo que necesita listar los cargos que una nota puede rebajar. */
export interface DependenciasParaListarCargos {
  unidadDeTrabajo: UnidadDeTrabajo;
  consultas: ConsultasDeDocumentos;
  cargaInicial: CargaInicial;
  fechasDeEntrada: FechasDeEntrada;
  umbral: UmbralDeBancarizacion;
}

/** Lo que necesita quitar una aplicación hecha a mano. */
export interface DependenciasParaQuitar {
  unidadDeTrabajo: UnidadDeTrabajo;
  documentos: RepositorioDeDocumentos;
  consultas: ConsultasDeDocumentos;
  aplicaciones: RepositorioDeAplicaciones;
  auditoria: Auditoria;
}

/** Lo que falta por pagar de un cargo, o el saldo libre de una nota, según la fila. */
export const saldoDeLaFila = (fila: FilaDeDocumento): number => saldoDe(fila.documento, aplicadoDe(fila)).saldoCentavos;

/** La fila de un documento con sus cuentas. @throws RecursoNoEncontrado si no existe o es de otra empresa. */
export async function filaExistente(
  consultas: ConsultasDeDocumentos,
  id: string,
  nombre = 'El documento',
): Promise<FilaDeDocumento> {
  const fila = await consultas.buscar(id);
  if (!fila) throw new RecursoNoEncontrado(nombre);
  return fila;
}
