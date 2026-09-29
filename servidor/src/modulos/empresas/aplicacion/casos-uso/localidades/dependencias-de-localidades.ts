import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type { Localidad } from '../../../dominio/localidad.js';
import type { ConsultasDeAccesosALocalidades } from '../../puertos/consultas-de-accesos-a-localidades.js';
import type { ConsultasLocalidades } from '../../puertos/consultas-localidades.js';
import type { RepositorioLocalidades } from '../../puertos/repositorio-localidades.js';

/** Lo que usan los casos de uso de las localidades. */
export interface DependenciasDeLocalidades {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioLocalidades;
  consultas: ConsultasLocalidades;
  auditoria: Auditoria;
  accesos: ConsultasDeAccesosALocalidades;
}

/** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
export async function localidadExistente(repositorio: RepositorioLocalidades, id: string): Promise<Localidad> {
  const localidad = await repositorio.buscar(Identificador.desde(id));
  if (!localidad) throw new RecursoNoEncontrado('La localidad');
  return localidad;
}
