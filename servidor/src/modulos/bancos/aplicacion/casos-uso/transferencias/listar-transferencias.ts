import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { FiltroDeTransferencias, TransferenciaDto } from '../../dto/transferencia.dto.js';
import type { DependenciasDeTransferencias } from './dependencias-de-transferencias.js';

/** Las transferencias de la empresa, de la más reciente a la más antigua; incluye las anuladas. */
export class ListarTransferencias {
  constructor(private readonly dependencias: Pick<DependenciasDeTransferencias, 'unidadDeTrabajo' | 'consultas'>) {}

  ejecutar(operador: Operador, filtro: FiltroDeTransferencias = {}): Promise<TransferenciaDto[]> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultas.listar(filtro));
  }
}
