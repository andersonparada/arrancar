import { eq } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { CondicionesDeProveedores } from '../../aplicacion/puertos/puertos-de-documentos.js';
import { condicionesDeProveedor } from './condiciones-de-proveedor.tablas.js';

/** La tabla tiene seguridad por cuenta (RLS): solo se ven las condiciones de los proveedores de la cuenta activa. */
export class CondicionesDeProveedoresDrizzle implements CondicionesDeProveedores {
  async diasDeCredito(proveedorId: string): Promise<number | null> {
    const [fila] = await transaccionEnCurso()
      .select({ dias: condicionesDeProveedor.diasDeCredito })
      .from(condicionesDeProveedor)
      .where(eq(condicionesDeProveedor.proveedorId, proveedorId));
    return fila?.dias ?? null;
  }
}
