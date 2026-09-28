import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { BancoDto } from '../../dto/banco.dto.js';
import type { DependenciasDeBancos } from './dependencias-de-bancos.js';

export class ObtenerBanco {
  constructor(private readonly dependencias: Pick<DependenciasDeBancos, 'unidadDeTrabajo' | 'consultas'>) {}

  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  ejecutar(operador: Operador, bancoId: string): Promise<BancoDto> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultas.obtener(bancoId));
  }
}
