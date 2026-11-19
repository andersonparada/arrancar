import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type { Unidad } from '../../../dominio/unidad.js';
import type { ConsultasUnidades } from '../../puertos/consultas-unidades.js';
import type { RepositorioUnidades } from '../../puertos/repositorio-unidades.js';

/** Lo que usan los casos de uso de las unidades de medida. */
export interface DependenciasDeUnidades {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioUnidades;
  consultas: ConsultasUnidades;
  auditoria: Auditoria;
}

/** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
export async function unidadExistente(repositorio: RepositorioUnidades, id: string): Promise<Unidad> {
  const unidad = await repositorio.buscar(Identificador.desde(id));
  if (!unidad) throw new RecursoNoEncontrado('La unidad de medida');
  return unidad;
}
