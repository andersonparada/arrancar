import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { DocumentosProtegidos } from '../../../../core/compartido/aplicacion/documentos-protegidos.js';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Reloj } from '../../../../core/compartido/aplicacion/reloj.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type { Conciliacion } from '../../../dominio/conciliacion.js';
import type { CargaInicial } from '../../puertos/carga-inicial.js';
import type { ConsultasConciliaciones } from '../../puertos/consultas-conciliaciones.js';
import type { PoliticaDeEstadoDeCuenta } from '../../puertos/politica-de-estado-de-cuenta.js';
import type { ConsultasMovimientos } from '../../puertos/consultas-movimientos.js';
import type { RepositorioConciliaciones } from '../../puertos/repositorio-conciliaciones.js';

/** Lo que usan los casos de uso de las conciliaciones. */
export interface DependenciasDeConciliaciones {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioConciliaciones;
  consultas: ConsultasConciliaciones;
  consultasMovimientos: ConsultasMovimientos;
  auditoria: Auditoria;
  reloj: Reloj;
  documentos: DocumentosProtegidos;
  politicaDeEstadoDeCuenta: PoliticaDeEstadoDeCuenta;
  /** La fecha de inicio de la empresa: fija el mes de la primera conciliación de una cuenta con saldo del banco. */
  cargaInicial: CargaInicial;
}

/** Recurso dueño de los estados de cuenta: solo se sirven desde la ruta de las conciliaciones, con su permiso. */
export const RECURSO_DE_ESTADOS_DE_CUENTA = 'bancos.conciliaciones';

/** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
export async function conciliacionExistente(repositorio: RepositorioConciliaciones, id: string): Promise<Conciliacion> {
  const conciliacion = await repositorio.buscar(Identificador.desde(id));
  if (!conciliacion) throw new RecursoNoEncontrado('La conciliación');
  return conciliacion;
}

/**
 * La busca y la bloquea hasta el fin de la transacción.
 * @throws RecursoNoEncontrado si no existe o no es de la empresa.
 */
export async function conciliacionBloqueada(repositorio: RepositorioConciliaciones, id: string): Promise<Conciliacion> {
  const conciliacion = await repositorio.bloquear(Identificador.desde(id));
  if (!conciliacion) throw new RecursoNoEncontrado('La conciliación');
  return conciliacion;
}
