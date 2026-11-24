import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { EstadoDeCierresDto } from '../../dto/cierre.dto.js';
import type { VistaDelKardex } from '../../dto/documento.dto.js';
import { ArmadorDelCierre } from './armador-del-cierre.js';
import type { DependenciasDeCierres } from './dependencias-de-cierres.js';
import { cierreADto } from './dtos-de-cierre.js';

export class ListarCierres {
  private readonly armador: ArmadorDelCierre;

  constructor(private readonly dependencias: DependenciasDeCierres) {
    this.armador = new ArmadorDelCierre(dependencias);
  }

  /**
   * Los meses que alguna vez se cerraron, del más reciente al más antiguo, y cuál toca cerrar ahora. Sin `costos.ver`
   * no lleva montos y sin alcance total tampoco las cifras de la empresa entera.
   */
  ejecutar(operador: Operador, vista: VistaDelKardex): Promise<EstadoDeCierresDto> {
    return this.dependencias.unidadDeTrabajo.ejecutar(operador, async () => ({
      siguienteMes: await this.armador.siguienteMes(operador),
      cierres: (await this.dependencias.cierres.listar()).map((cierre) => cierreADto(cierre, vista)),
    }));
  }
}
