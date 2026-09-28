import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type { CuentaBancaria } from '../../../dominio/cuenta-bancaria.js';
import type { ConsultasCuentasBancarias } from '../../puertos/consultas-cuentas-bancarias.js';
import type { RepositorioCuentasBancarias } from '../../puertos/repositorio-cuentas-bancarias.js';

/** Lo que usan los casos de uso de las cuentas bancarias. */
export interface DependenciasDeCuentasBancarias {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioCuentasBancarias;
  consultas: ConsultasCuentasBancarias;
  auditoria: Auditoria;
}

/** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
export async function cuentaBancariaExistente(
  repositorio: RepositorioCuentasBancarias,
  id: string,
): Promise<CuentaBancaria> {
  const cuentaBancaria = await repositorio.buscar(Identificador.desde(id));
  if (!cuentaBancaria) throw new RecursoNoEncontrado('La cuenta bancaria');
  return cuentaBancaria;
}
