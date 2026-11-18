import { sql } from 'drizzle-orm';
import {
  contextoEnCurso,
  transaccionEnCurso,
} from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { BloqueoDeBancarizacion } from '../../aplicacion/puertos/puertos-de-efectivo.js';

/**
 * El bloqueo de bancarización por empresa y proveedor: `pg_advisory_xact_lock` sobre un número que sale de los dos. Dura lo
 * que la transacción, así que otra operación que pague en efectivo al mismo proveedor espera y, al entrar, ya ve lo pagado.
 */
export class BloqueoDeBancarizacionDrizzle implements BloqueoDeBancarizacion {
  async bloquear(proveedorIds: readonly string[]): Promise<void> {
    const { empresaId } = contextoEnCurso();
    for (const proveedorId of [...new Set(proveedorIds)].sort()) {
      const clave = `cuentas-por-pagar.bancarizacion:${empresaId}:${proveedorId}`;
      await transaccionEnCurso().execute(sql`select pg_advisory_xact_lock(hashtextextended(${clave}, 0))`);
    }
  }
}
