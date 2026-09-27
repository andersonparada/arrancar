import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import type { CategoriaDeProveedor } from '../dominio/categoria-de-proveedor.js';
import type { Contacto } from '../dominio/contacto.js';
import type { Tercero } from '../dominio/tercero.js';
import type { RepositorioCategorias, RepositorioContactos, RepositorioTerceros } from './puertos/repositorios.js';

/** Búsquedas que un caso de uso necesita que existan; si no, responden "no existe o no tiene acceso". */

export async function terceroExistente(repositorio: RepositorioTerceros, terceroId: string): Promise<Tercero> {
  const tercero = await repositorio.buscar(Identificador.desde(terceroId));
  if (!tercero) throw new RecursoNoEncontrado('El cliente o proveedor');
  return tercero;
}

/** El contacto debe existir y ser del tercero indicado en la ruta. */
export async function contactoDelTercero(
  repositorio: RepositorioContactos,
  ids: { terceroId: string; contactoId: string },
): Promise<Contacto> {
  const contacto = await repositorio.buscar(Identificador.desde(ids.contactoId));
  if (!contacto?.esDe(Identificador.desde(ids.terceroId))) throw new RecursoNoEncontrado('El contacto');
  return contacto;
}

export async function categoriaExistente(
  repositorio: RepositorioCategorias,
  categoriaId: string,
): Promise<CategoriaDeProveedor> {
  const categoria = await repositorio.buscar(Identificador.desde(categoriaId));
  if (!categoria) throw new RecursoNoEncontrado('La categoría de proveedor');
  return categoria;
}
