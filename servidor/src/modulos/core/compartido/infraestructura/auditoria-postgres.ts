import type { Auditoria, EntradaDeAuditoria } from '../aplicacion/auditoria.js';
import { auditoria } from './persistencia/auditoria.tablas.js';
import { transaccionEnCurso } from './unidad-de-trabajo-postgres.js';

/** Escribe en `core.auditoria` dentro de la transacción del cambio que se audita. */
export class AuditoriaPostgres implements Auditoria {
  async registrar({ recurso, registroId, accion, anterior, motivo }: EntradaDeAuditoria): Promise<void> {
    await transaccionEnCurso()
      .insert(auditoria)
      .values({ recurso, registroId, accion, anterior: anterior ?? null, motivo: motivo ?? null });
  }
}
