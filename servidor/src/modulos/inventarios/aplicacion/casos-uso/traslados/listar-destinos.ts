import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { DestinoDeTrasladoDto } from '../../dto/destino-de-traslado.dto.js';
import type { DependenciasDeTraslados } from './dependencias-de-traslados.js';

type Dependencias = Pick<DependenciasDeTraslados, 'unidadDeTrabajo' | 'traslados'>;

/** Las bodegas que quien envía puede elegir como destino, vea o no esas bodegas (§3.5: el remitente solo ve la suya). */
export class ListarDestinos {
  constructor(private readonly dependencias: Dependencias) {}

  /** Id y nombre de las bodegas activas de la empresa. Quien lo pide ya tiene el permiso de crear traslados. */
  ejecutar(operador: Operador): Promise<DestinoDeTrasladoDto[]> {
    const { unidadDeTrabajo, traslados } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => traslados.destinos());
  }
}
