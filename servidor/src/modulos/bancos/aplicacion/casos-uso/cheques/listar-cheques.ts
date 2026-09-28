import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { ChequeDto } from '../../dto/cheque.dto.js';
import type { DependenciasDeCheques } from './dependencias-de-cheques.js';

interface FiltroDeCheques {
  chequeraId: string;
  estado?: 'disponible' | 'emitido' | 'anulado';
}

/** Los cheques de una chequera, opcionalmente filtrados por estado. */
export class ListarCheques {
  constructor(private readonly dependencias: Pick<DependenciasDeCheques, 'unidadDeTrabajo' | 'consultas'>) {}

  ejecutar(operador: Operador, { chequeraId, estado }: FiltroDeCheques): Promise<ChequeDto[]> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultas.listarDeLaChequera(chequeraId, estado));
  }
}
