import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Reloj } from '../../../../core/compartido/aplicacion/reloj.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type { FormatoGuardado } from '../../../dominio/formato-guardado.js';
import type { ConsultasFormatosDeCheque } from '../../puertos/consultas-formatos-de-cheque.js';
import type { LugarDeEmision } from '../../puertos/lugar-de-emision.js';
import type { RepositorioFormatosDeCheque } from '../../puertos/repositorio-formatos-de-cheque.js';

/** Lo que usan los casos de uso de los formatos de cheque. */
export interface DependenciasDeFormatosDeCheque {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioFormatosDeCheque;
  consultas: ConsultasFormatosDeCheque;
  auditoria: Auditoria;
  reloj: Reloj;
  lugarDeEmision: LugarDeEmision;
}

/** @throws RecursoNoEncontrado si no existe o no es de la cuenta. */
export async function formatoExistente(repositorio: RepositorioFormatosDeCheque, id: string): Promise<FormatoGuardado> {
  const formato = await repositorio.buscar(Identificador.desde(id));
  if (!formato) throw new RecursoNoEncontrado('El formato de cheque');
  return formato;
}
