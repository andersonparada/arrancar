import type { TareasDeLaTransaccion } from '../aplicacion/tareas-de-la-transaccion.js';
import { despuesDeConfirmar, hayUnidadDeTrabajoEnCurso, siSeDeshace } from './unidad-de-trabajo-postgres.js';

/** Ata tareas a la unidad de trabajo de PostgreSQL en curso. */
export class TareasDeLaTransaccionPostgres implements TareasDeLaTransaccion {
  hayTransaccion(): boolean {
    return hayUnidadDeTrabajoEnCurso();
  }

  async despuesDeConfirmar(tarea: () => Promise<void>, descripcion: string): Promise<void> {
    if (!despuesDeConfirmar(tarea, descripcion)) await tarea();
  }

  siSeDeshace(tarea: () => Promise<void>, descripcion: string): void {
    siSeDeshace(tarea, descripcion);
  }
}
