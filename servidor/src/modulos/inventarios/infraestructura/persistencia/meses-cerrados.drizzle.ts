import { and, eq, sql } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { MesesCerrados } from '../../aplicacion/puertos/entorno-del-kardex.js';
import { cierres } from './cierres.tablas.js';
import { CLAVE_DEL_CANDADO_DEL_CIERRE } from './repositorio-de-cierres.drizzle.js';

/**
 * Los meses cerrados del inventario (`inventarios.cierres`). Cada pregunta toma antes el candado **compartido** del
 * cierre (quien cierra o reabre lo toma exclusivo): así, aunque un caso de uso pregunte antes de bloquear los artículos,
 * lo que lee ya no cambia hasta que termina su transacción. Tomarlo dos veces en la misma transacción no estorba.
 */
export class MesesCerradosEnLaBase implements MesesCerrados {
  async estaCerrado(periodo: string): Promise<boolean> {
    await this.bloquearElCierre();
    const [fila] = await transaccionEnCurso()
      .select({ periodo: cierres.periodo })
      .from(cierres)
      .where(and(eq(cierres.periodo, periodo), eq(cierres.estado, 'cerrado')))
      .limit(1);
    return fila !== undefined;
  }

  async hayAlguno(): Promise<boolean> {
    await this.bloquearElCierre();
    const [fila] = await transaccionEnCurso()
      .select({ periodo: cierres.periodo })
      .from(cierres)
      .where(eq(cierres.estado, 'cerrado'))
      .limit(1);
    return fila !== undefined;
  }

  private async bloquearElCierre(): Promise<void> {
    await transaccionEnCurso().execute(sql`select pg_advisory_xact_lock_shared(${CLAVE_DEL_CANDADO_DEL_CIERRE})`);
  }
}
