import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type { ConceptoDeGasto } from '../../../dominio/concepto-de-gasto.js';
import type { ConsultasConceptosDeGasto } from '../../puertos/consultas-conceptos-de-gasto.js';
import type { RepositorioConceptosDeGasto } from '../../puertos/repositorio-conceptos-de-gasto.js';

/** Lo que usan los casos de uso de los conceptos de gasto. */
export interface DependenciasDeConceptosDeGasto {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioConceptosDeGasto;
  consultas: ConsultasConceptosDeGasto;
  auditoria: Auditoria;
}

/** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
export async function conceptoDeGastoExistente(
  repositorio: RepositorioConceptosDeGasto,
  id: string,
): Promise<ConceptoDeGasto> {
  const conceptoDeGasto = await repositorio.buscar(Identificador.desde(id));
  if (!conceptoDeGasto) throw new RecursoNoEncontrado('El concepto de gasto');
  return conceptoDeGasto;
}
