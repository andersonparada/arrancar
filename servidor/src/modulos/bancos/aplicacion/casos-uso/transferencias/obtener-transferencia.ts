import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { TransferenciaDto } from '../../dto/transferencia.dto.js';
import type { DependenciasDeTransferencias } from './dependencias-de-transferencias.js';

export class ObtenerTransferencia {
  constructor(private readonly dependencias: Pick<DependenciasDeTransferencias, 'unidadDeTrabajo' | 'consultas'>) {}

  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  ejecutar(operador: Operador, transferenciaId: string): Promise<TransferenciaDto> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultas.obtener(transferenciaId));
  }
}
