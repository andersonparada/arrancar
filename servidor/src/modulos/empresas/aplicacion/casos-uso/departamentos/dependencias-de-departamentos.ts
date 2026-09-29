import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type { Departamento } from '../../../dominio/departamento.js';
import type { ConsultasDepartamentos } from '../../puertos/consultas-departamentos.js';
import type { RepositorioDepartamentos } from '../../puertos/repositorio-departamentos.js';

/** Lo que usan los casos de uso de los departamentos. */
export interface DependenciasDeDepartamentos {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioDepartamentos;
  consultas: ConsultasDepartamentos;
  auditoria: Auditoria;
}

/** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
export async function departamentoExistente(repositorio: RepositorioDepartamentos, id: string): Promise<Departamento> {
  const departamento = await repositorio.buscar(Identificador.desde(id));
  if (!departamento) throw new RecursoNoEncontrado('El departamento');
  return departamento;
}
