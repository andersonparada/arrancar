import { and, desc, eq, sql } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { Cierres, ModoDeCandadoDelCierre } from '../../aplicacion/puertos/cierres.js';
import { cierres } from './cierres.tablas.js';
import { cuotas } from './cuotas.tablas.js';

const CANDADO = {
  compartido: sql`pg_advisory_xact_lock_shared`,
  exclusivo: sql`pg_advisory_xact_lock`,
} as const;

/** Los cierres mensuales de la empresa en PostgreSQL; la seguridad por empresa la pone la transacción. */
export class CierresDrizzle implements Cierres {
  async ultimoMesCerrado(): Promise<string | null> {
    const [fila] = await transaccionEnCurso()
      .select({ periodo: cierres.periodo })
      .from(cierres)
      .where(eq(cierres.estado, 'cerrado'))
      .orderBy(desc(cierres.periodo))
      .limit(1);
    return fila?.periodo ?? null;
  }

  async usaronTramosDelActivo(activoId: string): Promise<boolean> {
    const [fila] = await transaccionEnCurso()
      .select({ id: cuotas.id })
      .from(cuotas)
      .where(and(eq(cuotas.activoId, activoId), eq(cuotas.vigente, true)))
      .limit(1);
    return fila !== undefined;
  }

  /** La clave lleva la empresa de la transacción: cada empresa tiene su propio candado. */
  async bloquear(modo: ModoDeCandadoDelCierre): Promise<void> {
    await transaccionEnCurso().execute(
      sql`select ${CANDADO[modo]}(hashtextextended('activos-fijos.cierre:' || current_setting('app.empresa_id', true), 0))`,
    );
  }
}
