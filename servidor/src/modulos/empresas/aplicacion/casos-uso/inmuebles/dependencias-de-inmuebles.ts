import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type { Inmueble } from '../../../dominio/inmueble.js';
import type { ConsultasInmuebles } from '../../puertos/consultas-inmuebles.js';
import type { RepositorioInmuebles } from '../../puertos/repositorio-inmuebles.js';

/** Lo que usan los casos de uso de los inmuebles. */
export interface DependenciasDeInmuebles {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioInmuebles;
  consultas: ConsultasInmuebles;
  auditoria: Auditoria;
}

/** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
export async function inmuebleExistente(repositorio: RepositorioInmuebles, id: string): Promise<Inmueble> {
  const inmueble = await repositorio.buscar(Identificador.desde(id));
  if (!inmueble) throw new RecursoNoEncontrado('El inmueble');
  return inmueble;
}
