import type { TareasDeLaTransaccion } from '../aplicacion/tareas-de-la-transaccion.js';
import { despuesDeConfirmar, siSeDeshace } from './unidad-de-trabajo-postgres.js';

/** Ata tareas a la unidad de trabajo de PostgreSQL en curso. */
export class TareasDeLaTransaccionPostgres implements TareasDeLaTransaccion {
  async despuesDeConfirmar(tarea: () => Promise<void>): Promise<void> {
    if (!despuesDeConfirmar(tarea)) await tarea();
  }

  siSeDeshace(tarea: () => Promise<void>): void {
    siSeDeshace(tarea);
  }
}
