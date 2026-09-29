import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type { TipoDeLocalidad } from '../../../dominio/tipo-de-localidad.js';
import type { ConsultasTiposDeLocalidad } from '../../puertos/consultas-tipos-de-localidad.js';
import type { RepositorioTiposDeLocalidad } from '../../puertos/repositorio-tipos-de-localidad.js';

/** Lo que usan los casos de uso de los tipos de localidad. */
export interface DependenciasDeTiposDeLocalidad {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioTiposDeLocalidad;
  consultas: ConsultasTiposDeLocalidad;
  auditoria: Auditoria;
}

/** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
export async function tipoDeLocalidadExistente(
  repositorio: RepositorioTiposDeLocalidad,
  id: string,
): Promise<TipoDeLocalidad> {
  const tipoDeLocalidad = await repositorio.buscar(Identificador.desde(id));
  if (!tipoDeLocalidad) throw new RecursoNoEncontrado('El tipo de localidad');
  return tipoDeLocalidad;
}
