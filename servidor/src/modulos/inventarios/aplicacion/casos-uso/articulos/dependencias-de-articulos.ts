import type { Correlativos } from '../../../../core/compartido/aplicacion/correlativos.js';
import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Reloj } from '../../../../core/compartido/aplicacion/reloj.js';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type { Articulo } from '../../../dominio/articulo.js';
import type { AlmacenDeConversiones } from '../../puertos/almacen-de-conversiones.js';
import type { AlmacenDeLotes } from '../../puertos/almacen-de-lotes.js';
import type { ConsultasArticulos } from '../../puertos/consultas-articulos.js';
import type { LectorDePrefijoDeCodigos } from '../../puertos/lector-de-prefijo-de-codigos.js';
import type { RepositorioArticulos } from '../../puertos/repositorio-articulos.js';

/** Lo que usan los casos de uso de los artículos. */
export interface DependenciasDeArticulos {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioArticulos;
  consultas: ConsultasArticulos;
  auditoria: Auditoria;
  conversiones: AlmacenDeConversiones;
  lotes: AlmacenDeLotes;
  correlativos: Correlativos;
  prefijo: LectorDePrefijoDeCodigos;
  reloj: Reloj;
}

/** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
export async function articuloExistente(repositorio: RepositorioArticulos, id: string): Promise<Articulo> {
  const articulo = await repositorio.buscar(Identificador.desde(id));
  if (!articulo) throw new RecursoNoEncontrado('El artículo');
  return articulo;
}
