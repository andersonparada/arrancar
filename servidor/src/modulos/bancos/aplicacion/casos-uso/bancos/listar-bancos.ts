import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { BancoDto } from '../../dto/banco.dto.js';
import type { DependenciasDeBancos } from './dependencias-de-bancos.js';

/** Los bancos de la empresa, ordenados por nombre. */
export class ListarBancos {
  constructor(private readonly dependencias: Pick<DependenciasDeBancos, 'unidadDeTrabajo' | 'consultas'>) {}

  ejecutar(operador: Operador): Promise<BancoDto[]> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultas.listar());
  }
}
