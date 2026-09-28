import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type { Banco } from '../../../dominio/banco.js';
import type { ConsultasBancos } from '../../puertos/consultas-bancos.js';
import type { RepositorioBancos } from '../../puertos/repositorio-bancos.js';

/** Lo que usan los casos de uso de los bancos. */
export interface DependenciasDeBancos {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioBancos;
  consultas: ConsultasBancos;
  auditoria: Auditoria;
}

/** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
export async function bancoExistente(repositorio: RepositorioBancos, id: string): Promise<Banco> {
  const banco = await repositorio.buscar(Identificador.desde(id));
  if (!banco) throw new RecursoNoEncontrado('El banco');
  return banco;
}
