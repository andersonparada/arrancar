import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import '../../core/contratos/inventarios.contratos.js';
import { mediador } from '../../core/mediador/contexto.js';
import type { PreguntasDelCierre } from '../aplicacion/puertos/preguntas-del-cierre.js';
import type { Hallazgo } from '../dominio/cierre/hallazgos-del-cierre.js';

/** La pregunta va por el mediador (`preguntarATodos`): este módulo no conoce a quienes responden. */
export class PreguntasDelCierreEnMediador implements PreguntasDelCierre {
  async hallazgosDeOtrosModulos(operador: Operador, periodo: string): Promise<Hallazgo[]> {
    const respuestas = await mediador.preguntarATodos(operador, 'inventarios.revisar_cierre_del_mes', {
      empresaId: operador.empresaId,
      periodo,
    });
    return respuestas.flatMap(({ respuesta }) =>
      respuesta.hallazgos.map((hallazgo): Hallazgo => ({
        ...hallazgo,
        cantidad: 1,
        detalle: [],
        modulo: respuesta.nombreDelModulo,
      })),
    );
  }
}
