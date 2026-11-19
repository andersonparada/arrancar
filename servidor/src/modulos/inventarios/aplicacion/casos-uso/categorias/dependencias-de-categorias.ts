import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type { Categoria } from '../../../dominio/categoria.js';
import type { ConsultasCategorias } from '../../puertos/consultas-categorias.js';
import type { RepositorioCategorias } from '../../puertos/repositorio-categorias.js';

/** Lo que usan los casos de uso de las categorías. */
export interface DependenciasDeCategorias {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioCategorias;
  consultas: ConsultasCategorias;
  auditoria: Auditoria;
}

/** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
export async function categoriaExistente(repositorio: RepositorioCategorias, id: string): Promise<Categoria> {
  const categoria = await repositorio.buscar(Identificador.desde(id));
  if (!categoria) throw new RecursoNoEncontrado('La categoría');
  return categoria;
}
