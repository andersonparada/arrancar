import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { CuentaDto } from '../../dto/cuenta.dto.js';
import type { DependenciasDeCuentas } from './dependencias-de-cuentas.js';

export class ObtenerCuenta {
  constructor(private readonly dependencias: Pick<DependenciasDeCuentas, 'unidadDeTrabajo' | 'consultas'>) {}

  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  ejecutar(operador: Operador, cuentaId: string): Promise<CuentaDto> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultas.obtener(cuentaId));
  }
}
