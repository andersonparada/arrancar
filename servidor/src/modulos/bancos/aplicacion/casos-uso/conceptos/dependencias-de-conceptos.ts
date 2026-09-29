import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type { Concepto } from '../../../dominio/concepto.js';
import type { ConsultasConceptos } from '../../puertos/consultas-conceptos.js';
import type { RepositorioConceptos } from '../../puertos/repositorio-conceptos.js';

/** Lo que usan los casos de uso de los conceptos. */
export interface DependenciasDeConceptos {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioConceptos;
  consultas: ConsultasConceptos;
  auditoria: Auditoria;
}

/** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
export async function conceptoExistente(repositorio: RepositorioConceptos, id: string): Promise<Concepto> {
  const concepto = await repositorio.buscar(Identificador.desde(id));
  if (!concepto) throw new RecursoNoEncontrado('El concepto');
  return concepto;
}
