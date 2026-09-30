import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type { VigenciaDeCombustible } from '../../../dominio/vigencia-de-combustible.js';
import type { ConsultasVigenciasDeCombustible } from '../../puertos/consultas-vigencias-de-combustible.js';
import type { RepositorioVigenciasDeCombustible } from '../../puertos/repositorio-vigencias-de-combustible.js';

/** Lo que usan los casos de uso de las vigencias de combustible. */
export interface DependenciasDeVigenciasDeCombustible {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioVigenciasDeCombustible;
  consultas: ConsultasVigenciasDeCombustible;
  auditoria: Auditoria;
}

/** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
export async function vigenciaDeCombustibleExistente(
  repositorio: RepositorioVigenciasDeCombustible,
  id: string,
): Promise<VigenciaDeCombustible> {
  const vigenciaDeCombustible = await repositorio.buscar(Identificador.desde(id));
  if (!vigenciaDeCombustible) throw new RecursoNoEncontrado('La vigencia de combustible');
  return vigenciaDeCombustible;
}
