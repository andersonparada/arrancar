import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type { TipoDeParcela } from '../../../dominio/tipo-de-parcela.js';
import type { ConsultasTiposDeParcela } from '../../puertos/consultas-tipos-de-parcela.js';
import type { RepositorioTiposDeParcela } from '../../puertos/repositorio-tipos-de-parcela.js';

/** Lo que usan los casos de uso de los tipos de parcela. */
export interface DependenciasDeTiposDeParcela {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioTiposDeParcela;
  consultas: ConsultasTiposDeParcela;
  auditoria: Auditoria;
}

/** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
export async function tipoDeParcelaExistente(
  repositorio: RepositorioTiposDeParcela,
  id: string,
): Promise<TipoDeParcela> {
  const tipoDeParcela = await repositorio.buscar(Identificador.desde(id));
  if (!tipoDeParcela) throw new RecursoNoEncontrado('El tipo de parcela');
  return tipoDeParcela;
}
