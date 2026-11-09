import { and, eq } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { proveedores } from '../../../terceros/infraestructura/persistencia/proveedores.tablas.js';
import { terceros } from '../../../terceros/infraestructura/persistencia/terceros.tablas.js';
import type { ProveedoresParaSaldos } from '../../aplicacion/puertos/puertos-de-saldos-iniciales.js';

/** Las tablas tienen seguridad por cuenta (RLS): solo se ven los proveedores de la cuenta activa. */
export class ProveedoresParaSaldosDrizzle implements ProveedoresParaSaldos {
  async estaDisponible(proveedorId: string): Promise<boolean> {
    const [fila] = await transaccionEnCurso()
      .select({ id: proveedores.id })
      .from(proveedores)
      .innerJoin(terceros, eq(terceros.id, proveedores.terceroId))
      .where(and(eq(proveedores.id, proveedorId), eq(proveedores.activo, true), eq(terceros.activo, true)));
    return fila !== undefined;
  }
}
