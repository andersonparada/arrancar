import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { ImpresionRegistradaDto } from '../../dto/impresion-de-cheque.dto.js';
import { chequeExistente } from '../cheques/dependencias-de-cheques.js';
import type { DependenciasDeImpresionDeCheques } from './dependencias-de-impresion-de-cheques.js';

/** Las impresiones de un cheque (`cheques.ver`): quién, cuándo, si fue copia y por qué. */
export class HistorialDeImpresiones {
  constructor(private readonly dependencias: DependenciasDeImpresionDeCheques) {}

  /** @throws RecursoNoEncontrado si el cheque no existe o no es de la empresa. */
  ejecutar(operador: Operador, chequeId: string): Promise<ImpresionRegistradaDto[]> {
    const { unidadDeTrabajo, repositorio, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      await chequeExistente(repositorio, chequeId);
      return consultas.historial(chequeId);
    });
  }
}
