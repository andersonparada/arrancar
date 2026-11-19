import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import type { RevisionDeCierreDeModulo } from '../../core/contratos/empresas.contratos.js';
import { mediador } from '../../core/mediador/contexto.js';
import type { PreguntasDeCierre } from '../aplicacion/puertos/preguntas-de-cierre.js';

/** Pregunta por el mediador; responden solo los módulos activos en la cuenta. */
export class PreguntasDeCierreEnMediador implements PreguntasDeCierre {
  async revisar(
    operador: Operador,
    datos: { empresaId: string; fechaDeInicio: string },
  ): Promise<RevisionDeCierreDeModulo[]> {
    const respuestas = await mediador.preguntarATodos(operador, 'empresas.revisar_cierre_de_carga', datos);
    return respuestas.map(({ respuesta }) => respuesta);
  }
}
