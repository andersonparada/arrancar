import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type { Bodega } from '../../../dominio/bodega.js';
import type { ConsultasDeUsoDelKardex } from '../../puertos/consultas-de-uso-del-kardex.js';
import type { ConsultasDeAccesosABodegas } from '../../puertos/consultas-de-accesos-a-bodegas.js';
import type { ConsultasBodegas } from '../../puertos/consultas-bodegas.js';
import type { RepositorioBodegas } from '../../puertos/repositorio-bodegas.js';

/** Lo que usan los casos de uso de las bodegas. */
export interface DependenciasDeBodegas {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioBodegas;
  consultas: ConsultasBodegas;
  auditoria: Auditoria;
  accesos: ConsultasDeAccesosABodegas;
  uso: ConsultasDeUsoDelKardex;
}

/** @throws RecursoNoEncontrado si no existe o el operador no la ve. */
export async function bodegaExistente(repositorio: RepositorioBodegas, id: string): Promise<Bodega> {
  const bodega = await repositorio.buscar(Identificador.desde(id));
  if (!bodega) throw new RecursoNoEncontrado('La bodega');
  return bodega;
}
