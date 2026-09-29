import { and, eq, inArray } from 'drizzle-orm';
import type { Ejecutor } from '../../../base-datos/conexion.js';
import { transaccionEnCurso } from '../../../compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { empresas, empresaUsuarios } from '../../../cuentas/infraestructura/persistencia/empresas.tablas.js';
import type { AccesosAEmpresas } from '../../aplicacion/puertos/accesos-a-empresas.js';

/** `core.empresa_usuarios` no tiene seguridad por filas: se filtra por cuenta. */
export class AccesosAEmpresasDrizzle implements AccesosAEmpresas {
  constructor(private readonly ejecutor: () => Ejecutor = transaccionEnCurso) {}

  async empresasDeLaCuenta(cuentaId: string): Promise<Map<string, string>> {
    const filas = await this.ejecutor()
      .select({ id: empresas.id, nombre: empresas.nombre })
      .from(empresas)
      .where(eq(empresas.cuentaId, cuentaId));
    return new Map(filas.map((fila) => [fila.id, fila.nombre]));
  }

  async empresasDelUsuario(usuarioId: string, cuentaId: string): Promise<Set<string>> {
    const filas = await this.ejecutor()
      .select({ id: empresaUsuarios.empresaId })
      .from(empresaUsuarios)
      .innerJoin(empresas, eq(empresas.id, empresaUsuarios.empresaId))
      .where(and(eq(empresaUsuarios.usuarioId, usuarioId), eq(empresas.cuentaId, cuentaId)));
    return new Set(filas.map((fila) => fila.id));
  }

  async agregar(usuarioId: string, empresaIds: readonly string[]): Promise<void> {
    if (empresaIds.length === 0) return;
    await this.ejecutor()
      .insert(empresaUsuarios)
      .values(empresaIds.map((empresaId) => ({ empresaId, usuarioId })));
  }

  async quitar(usuarioId: string, empresaIds: readonly string[]): Promise<void> {
    if (empresaIds.length === 0) return;
    await this.ejecutor()
      .delete(empresaUsuarios)
      .where(and(eq(empresaUsuarios.usuarioId, usuarioId), inArray(empresaUsuarios.empresaId, [...empresaIds])));
  }
}
