import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type { Conciliacion } from '../../../dominio/conciliacion.js';
import type { ConsultasConciliaciones } from '../../puertos/consultas-conciliaciones.js';
import type { ConsultasMovimientos } from '../../puertos/consultas-movimientos.js';
import type { RepositorioConciliaciones } from '../../puertos/repositorio-conciliaciones.js';

/** Lo que usan los casos de uso de las conciliaciones. */
export interface DependenciasDeConciliaciones {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioConciliaciones;
  consultas: ConsultasConciliaciones;
  consultasMovimientos: ConsultasMovimientos;
  auditoria: Auditoria;
}

/** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
export async function conciliacionExistente(repositorio: RepositorioConciliaciones, id: string): Promise<Conciliacion> {
  const conciliacion = await repositorio.buscar(Identificador.desde(id));
  if (!conciliacion) throw new RecursoNoEncontrado('La conciliación');
  return conciliacion;
}
