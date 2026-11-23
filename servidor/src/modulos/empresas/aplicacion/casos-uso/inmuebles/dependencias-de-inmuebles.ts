import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type { Inmueble } from '../../../dominio/inmueble.js';
import type { ConsultasInmuebles } from '../../puertos/consultas-inmuebles.js';
import type { InmuebleDto } from '../../dto/inmueble.dto.js';
import type { ValorDeInmuebleDto } from '../../dto/valor-de-inmueble.dto.js';
import type { ConsultasValoresDeInmueble } from '../../puertos/valores-de-inmueble.js';
import type { RepositorioInmuebles } from '../../puertos/repositorio-inmuebles.js';

/** Lo que usan los casos de uso de los inmuebles. */
export interface DependenciasDeInmuebles {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioInmuebles;
  consultas: ConsultasInmuebles;
  /** Para dejar en la auditoría los valores con que estaba el inmueble. */
  valores: ConsultasValoresDeInmueble;
  auditoria: Auditoria;
}

/** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
export async function inmuebleExistente(repositorio: RepositorioInmuebles, id: string): Promise<Inmueble> {
  const inmueble = await repositorio.buscar(Identificador.desde(id));
  if (!inmueble) throw new RecursoNoEncontrado('El inmueble');
  return inmueble;
}

/** El inmueble como estaba, con sus valores (las dos series): lo que queda en la auditoría al eliminarlo o cambiar su estado. */
export async function inmuebleParaAuditar(
  dependencias: Pick<DependenciasDeInmuebles, 'consultas' | 'valores'>,
  inmuebleId: string,
): Promise<InmuebleDto & { valores: ValorDeInmuebleDto[] }> {
  const inmueble = await dependencias.consultas.obtener(inmuebleId);
  return { ...inmueble, valores: await dependencias.valores.listar(inmuebleId) };
}
