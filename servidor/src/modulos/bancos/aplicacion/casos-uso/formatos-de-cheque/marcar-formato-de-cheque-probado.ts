import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { FormatoDeChequeDto } from '../../dto/formato-de-cheque.dto.js';
import { formatoExistente, type DependenciasDeFormatosDeCheque } from './dependencias-de-formatos-de-cheque.js';

/** «La prueba quedó alineada»: guarda cuándo. Al cambiar la plantilla o los ajustes, se pierde. */
export class MarcarFormatoDeChequeProbado {
  constructor(private readonly dependencias: DependenciasDeFormatosDeCheque) {}

  /** @throws RecursoNoEncontrado si no existe o no es de la cuenta. */
  ejecutar(operador: Operador, formatoId: string): Promise<FormatoDeChequeDto> {
    const { unidadDeTrabajo, repositorio, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const formato = await formatoExistente(repositorio, formatoId);
      formato.marcarProbado(new Date());
      await repositorio.guardar(formato);
      return consultas.obtener(formatoId);
    });
  }
}
