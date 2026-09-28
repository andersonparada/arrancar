import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { CuentaBancariaDto } from '../../dto/cuenta-bancaria.dto.js';
import type { DependenciasDeCuentasBancarias } from './dependencias-de-cuentas-bancarias.js';

/** Las cuentas bancarias de la empresa, ordenados por nombre corto. */
export class ListarCuentasBancarias {
  constructor(private readonly dependencias: Pick<DependenciasDeCuentasBancarias, 'unidadDeTrabajo' | 'consultas'>) {}

  ejecutar(operador: Operador): Promise<CuentaBancariaDto[]> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultas.listar());
  }
}
