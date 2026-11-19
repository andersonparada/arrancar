import type { Cierres } from '../../puertos/cierres.js';
import type { LectorDePrimerMes } from '../../puertos/lector-de-primer-mes.js';
import type { LectorDeTopes } from '../../puertos/lector-de-topes.js';
import type { RepositorioCostos } from '../../puertos/repositorio-costos.js';
import type { RepositorioTramos } from '../../puertos/repositorio-tramos.js';
import type { DependenciasDeActivos } from './dependencias-de-activos.js';

/** Lo que usan «poner en uso» y «quitar de uso»: lo de los activos más sus costos, sus tramos y los cierres. */
export interface DependenciasDeUso extends Pick<
  DependenciasDeActivos,
  'unidadDeTrabajo' | 'repositorio' | 'consultas' | 'clases' | 'auditoria'
> {
  costos: RepositorioCostos;
  tramos: RepositorioTramos;
  cierres: Cierres;
  topes: LectorDeTopes;
  primerMes: LectorDePrimerMes;
}
