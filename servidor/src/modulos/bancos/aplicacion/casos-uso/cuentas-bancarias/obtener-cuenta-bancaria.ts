import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { CuentaBancariaDto } from '../../dto/cuenta-bancaria.dto.js';
import type { DependenciasDeCuentasBancarias } from './dependencias-de-cuentas-bancarias.js';

export class ObtenerCuentaBancaria {
  constructor(private readonly dependencias: Pick<DependenciasDeCuentasBancarias, 'unidadDeTrabajo' | 'consultas'>) {}

  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  ejecutar(operador: Operador, cuentaBancariaId: string): Promise<CuentaBancariaDto> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultas.obtener(cuentaBancariaId));
  }
}
