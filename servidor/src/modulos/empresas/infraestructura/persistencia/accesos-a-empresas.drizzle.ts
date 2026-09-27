import { and, eq } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { empresaUsuarios } from '../../../core/esquemas/empresas.esquema.js';
import type { AccesosAEmpresas } from '../../aplicacion/puertos/accesos-a-empresas.js';

export class AccesosAEmpresasDrizzle implements AccesosAEmpresas {
  async empresasDelUsuario(usuarioId: string): Promise<ReadonlySet<string>> {
    const filas = await transaccionEnCurso()
      .select({ empresaId: empresaUsuarios.empresaId })
      .from(empresaUsuarios)
      .where(eq(empresaUsuarios.usuarioId, usuarioId));
    return new Set(filas.map((fila) => fila.empresaId));
  }

  async rolEnEmpresa(usuarioId: string, empresaId: string): Promise<string | null> {
    const [fila] = await transaccionEnCurso()
      .select({ rolId: empresaUsuarios.rolId })
      .from(empresaUsuarios)
      .where(and(eq(empresaUsuarios.usuarioId, usuarioId), eq(empresaUsuarios.empresaId, empresaId)));
    return fila?.rolId ?? null;
  }

  async darAcceso(acceso: { empresaId: string; usuarioId: string; rolId: string }): Promise<void> {
    await transaccionEnCurso()
      .insert(empresaUsuarios)
      .values(acceso)
      .onConflictDoUpdate({
        target: [empresaUsuarios.empresaId, empresaUsuarios.usuarioId],
        set: { rolId: acceso.rolId },
      });
  }
}
