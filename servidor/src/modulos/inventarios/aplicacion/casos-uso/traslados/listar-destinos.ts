import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { DestinoDeTrasladoDto } from '../../dto/destino-de-traslado.dto.js';
import type { DependenciasDeTraslados } from './dependencias-de-traslados.js';

type Dependencias = Pick<DependenciasDeTraslados, 'unidadDeTrabajo' | 'traslados' | 'transito'>;

/** Las bodegas que quien envía puede elegir como destino: con tránsito, vea o no esas bodegas; sin tránsito, solo las que ve. */
export class ListarDestinos {
  constructor(private readonly dependencias: Dependencias) {}

  /** Id y nombre de las bodegas activas elegibles. Quien lo pide ya tiene el permiso de crear traslados. */
  async ejecutar(operador: Operador): Promise<DestinoDeTrasladoDto[]> {
    const { unidadDeTrabajo, traslados, transito } = this.dependencias;
    const conTransito = await transito.conTransito(operador);
    return unidadDeTrabajo.ejecutar(operador, () => traslados.destinos(conTransito));
  }
}
