import { eq } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { empresaUsuarios } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import type { AccesosAEmpresas } from '../../aplicacion/puertos/accesos-a-empresas.js';

export class AccesosAEmpresasDrizzle implements AccesosAEmpresas {
  async empresasDelUsuario(usuarioId: string): Promise<ReadonlySet<string>> {
    const filas = await transaccionEnCurso()
      .select({ empresaId: empresaUsuarios.empresaId })
      .from(empresaUsuarios)
      .where(eq(empresaUsuarios.usuarioId, usuarioId));
    return new Set(filas.map((fila) => fila.empresaId));
  }

  async darAcceso(acceso: { empresaId: string; usuarioId: string }): Promise<void> {
    await transaccionEnCurso().insert(empresaUsuarios).values(acceso).onConflictDoNothing();
  }
}
