import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type { Combustible } from '../../../dominio/combustible.js';
import type { ConsultasCombustibles } from '../../puertos/consultas-combustibles.js';
import type { RepositorioCombustibles } from '../../puertos/repositorio-combustibles.js';

/** Lo que usan los casos de uso de los combustibles. */
export interface DependenciasDeCombustibles {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioCombustibles;
  consultas: ConsultasCombustibles;
  auditoria: Auditoria;
}

/** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
export async function combustibleExistente(repositorio: RepositorioCombustibles, id: string): Promise<Combustible> {
  const combustible = await repositorio.buscar(Identificador.desde(id));
  if (!combustible) throw new RecursoNoEncontrado('El combustible');
  return combustible;
}
