import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type { Chequera } from '../../../dominio/chequera.js';
import type { ConsultasChequeras } from '../../puertos/consultas-chequeras.js';
import type { ConsultasMovimientos } from '../../puertos/consultas-movimientos.js';
import type { LimiteDeChequera } from '../../puertos/limite-de-chequera.js';
import type { RepositorioCheques } from '../../puertos/repositorio-cheques.js';
import type { RepositorioChequeras } from '../../puertos/repositorio-chequeras.js';

/** Lo que usan los casos de uso de las chequeras. */
export interface DependenciasDeChequeras {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioChequeras;
  repositorioCheques: RepositorioCheques;
  consultas: ConsultasChequeras;
  consultasMovimientos: ConsultasMovimientos;
  limiteDeChequera: LimiteDeChequera;
  auditoria: Auditoria;
}

/** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
export async function chequeraExistente(repositorio: RepositorioChequeras, id: string): Promise<Chequera> {
  const chequera = await repositorio.buscar(Identificador.desde(id));
  if (!chequera) throw new RecursoNoEncontrado('La chequera');
  return chequera;
}
