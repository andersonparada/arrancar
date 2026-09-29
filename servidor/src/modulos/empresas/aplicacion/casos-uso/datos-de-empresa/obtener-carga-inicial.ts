import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { CargaInicialDto } from '../../dto/datos-de-empresa.dto.js';
import type { DependenciasDeDatosDeEmpresa } from './dependencias.js';

export class ObtenerCargaInicial {
  constructor(private readonly dependencias: DependenciasDeDatosDeEmpresa) {}

  /** @throws RecursoNoEncontrado si la empresa no es de la cuenta o el operador no tiene acceso a ella. */
  ejecutar(operador: Operador, empresaId: string): Promise<CargaInicialDto> {
    const { ejecutorEnEmpresa, consultas } = this.dependencias;
    return ejecutorEnEmpresa.ejecutar(operador, empresaId, () => consultas.cargaInicial(empresaId));
  }
}
