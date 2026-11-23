import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { BoletaDeTrasladoDto } from '../../dto/boleta-de-traslado.dto.js';
import type { DependenciasDeTraslados } from './dependencias-de-traslados.js';

type Dependencias = Pick<DependenciasDeTraslados, 'unidadDeTrabajo' | 'traslados'>;

/** La boleta imprimible de un traslado (§6.7): sin ningún costo, con quién entrega y quién recibe. */
export class ObtenerBoleta {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * La pide quien ve el origen o el destino, con la salida o con la recepción.
   * @throws RecursoNoEncontrado si no existe o el usuario no la ve.
   * @throws DocumentoInvalido si el documento no es un traslado.
   */
  ejecutar(operador: Operador, documentoId: string): Promise<BoletaDeTrasladoDto> {
    const { unidadDeTrabajo, traslados } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => traslados.boleta(documentoId));
  }
}
