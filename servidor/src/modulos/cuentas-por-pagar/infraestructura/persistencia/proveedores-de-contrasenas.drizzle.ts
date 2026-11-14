import { eq } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { proveedores } from '../../../terceros/infraestructura/persistencia/proveedores.tablas.js';
import type { ProveedoresDeContrasenas } from '../../aplicacion/puertos/puertos-de-contrasenas.js';

/** Las tablas tienen seguridad por cuenta (RLS): solo se ven los proveedores de la cuenta activa, activos o no. */
export class ProveedoresDeContrasenasDrizzle implements ProveedoresDeContrasenas {
  async existe(proveedorId: string): Promise<boolean> {
    const [fila] = await transaccionEnCurso()
      .select({ id: proveedores.id })
      .from(proveedores)
      .where(eq(proveedores.id, proveedorId));
    return fila !== undefined;
  }
}
