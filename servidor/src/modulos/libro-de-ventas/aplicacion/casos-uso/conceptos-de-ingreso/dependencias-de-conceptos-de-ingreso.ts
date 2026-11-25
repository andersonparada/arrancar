import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type { ConceptoDeIngreso } from '../../../dominio/concepto-de-ingreso.js';
import type { ConsultasConceptosDeIngreso } from '../../puertos/consultas-conceptos-de-ingreso.js';
import type { RepositorioConceptosDeIngreso } from '../../puertos/repositorio-conceptos-de-ingreso.js';

/** Lo que usan los casos de uso de los conceptos de ingreso. */
export interface DependenciasDeConceptosDeIngreso {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioConceptosDeIngreso;
  consultas: ConsultasConceptosDeIngreso;
  auditoria: Auditoria;
}

/** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
export async function conceptoDeIngresoExistente(
  repositorio: RepositorioConceptosDeIngreso,
  id: string,
): Promise<ConceptoDeIngreso> {
  const conceptoDeIngreso = await repositorio.buscar(Identificador.desde(id));
  if (!conceptoDeIngreso) throw new RecursoNoEncontrado('El concepto de ingreso');
  return conceptoDeIngreso;
}
