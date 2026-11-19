import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type { Clase } from '../../../dominio/clase.js';
import type { ConsultasClases } from '../../puertos/consultas-clases.js';
import type { LectorDeTopes } from '../../puertos/lector-de-topes.js';
import type { RelacionClasesConceptos } from '../../puertos/relacion-clases-conceptos.js';
import type { RepositorioClases } from '../../puertos/repositorio-clases.js';

/** Lo que usan los casos de uso de las clases de activos. */
export interface DependenciasDeClases {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioClases;
  consultas: ConsultasClases;
  auditoria: Auditoria;
  topes: LectorDeTopes;
  relacion: RelacionClasesConceptos;
}

/** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
export async function claseExistente(repositorio: RepositorioClases, id: string): Promise<Clase> {
  const clase = await repositorio.buscar(Identificador.desde(id));
  if (!clase) throw new RecursoNoEncontrado('La clase de activo');
  return clase;
}
