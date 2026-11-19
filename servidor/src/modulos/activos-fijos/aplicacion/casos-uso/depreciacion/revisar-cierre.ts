import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { RevisionDelCierreDto } from '../../dto/cierre.dto.js';
import { ArmadorDelCierre } from './armador-del-cierre.js';
import type { DependenciasDeCierre } from './dependencias-de-cierre.js';
import { revisionADto } from './dtos-de-cierre.js';

export class RevisarCierre {
  private readonly armador: ArmadorDelCierre;

  constructor(private readonly dependencias: DependenciasDeCierre) {
    this.armador = new ArmadorDelCierre(dependencias);
  }

  /**
   * Lo que se ve antes de cerrar un mes: los hallazgos (avisos y bloqueos), los totales que saldrán y una huella para
   * saber si algo cambió entre revisar y cerrar. No guarda nada. Un mes posterior al siguiente muestra solo el
   * bloqueo de «cerrar primero el anterior».
   * @throws MesCerrado, MesAnteriorAlInicio o SinMesPorCerrar si el mes no se puede revisar.
   */
  ejecutar(operador: Operador, periodo: string): Promise<RevisionDelCierreDto> {
    return this.dependencias.unidadDeTrabajo.ejecutar(operador, async () =>
      revisionADto(await this.armador.armar(operador, periodo)),
    );
  }
}
