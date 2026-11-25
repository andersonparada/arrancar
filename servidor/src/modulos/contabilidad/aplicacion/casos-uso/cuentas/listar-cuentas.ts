import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { CuentaDto } from '../../dto/cuenta.dto.js';
import type { DependenciasDeCuentas } from './dependencias-de-cuentas.js';

/** Las cuentas de la empresa, ordenados por nombre. */
export class ListarCuentas {
  constructor(private readonly dependencias: Pick<DependenciasDeCuentas, 'unidadDeTrabajo' | 'consultas'>) {}

  ejecutar(operador: Operador): Promise<CuentaDto[]> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultas.listar());
  }
}
