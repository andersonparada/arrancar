import type { Alcance, VariableDto } from '../dto/variable.dto.js';
import type { LectorDeConfiguracion } from '../lector-de-configuracion.js';

/** Las variables que la cuenta o la empresa pueden cambiar; las de instalación son de soporte. */
export class ListarVariablesEditables {
  constructor(private readonly dependencias: { lector: LectorDeConfiguracion }) {}

  async ejecutar(alcance: Alcance): Promise<VariableDto[]> {
    const variables = await this.dependencias.lector.listar(alcance);
    return variables.filter((v) => v.niveles.includes('cuenta') || v.niveles.includes('empresa'));
  }
}
