import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { EstadoDeDepreciacionDto } from '../../dto/cierre.dto.js';
import { ArmadorDelCierre } from './armador-del-cierre.js';
import type { DependenciasDeCierre } from './dependencias-de-cierre.js';
import { cierreADto } from './dtos-de-cierre.js';

export class ListarCierres {
  private readonly armador: ArmadorDelCierre;

  constructor(private readonly dependencias: DependenciasDeCierre) {
    this.armador = new ArmadorDelCierre(dependencias);
  }

  /** Los meses que alguna vez se cerraron, del más reciente al más antiguo, y cuál toca cerrar ahora. */
  ejecutar(operador: Operador): Promise<EstadoDeDepreciacionDto> {
    return this.dependencias.unidadDeTrabajo.ejecutar(operador, async () => ({
      siguienteMes: await this.armador.siguienteMes(operador),
      cierres: (await this.dependencias.repositorioCierres.listar()).map(cierreADto),
    }));
  }
}
