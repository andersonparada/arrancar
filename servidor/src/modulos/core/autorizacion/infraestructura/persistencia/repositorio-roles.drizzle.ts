import { and, count, eq } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { Identificador, type CuentaId } from '../../../compartido/dominio/identificador.js';
import { empresaUsuarios } from '../../../esquemas/empresas.esquema.js';
import type { RepositorioRoles } from '../../aplicacion/puertos/repositorio-roles.js';
import { Rol, type RolId, type UsoDelRol } from '../../dominio/rol.js';
import { actualizarRol, insertarRol } from './escritura-de-roles.js';
import { rolPermisos, roles } from './roles.tablas.js';

/** `core.roles` no tiene seguridad por filas, así que cada búsqueda filtra por cuenta. */
export class RepositorioRolesDrizzle implements RepositorioRoles {
  async buscarEnCuenta(id: RolId, cuentaId: CuentaId): Promise<Rol | null> {
    const tx = transaccionEnCurso();
    const [fila] = await tx
      .select()
      .from(roles)
      .where(and(eq(roles.id, id.valor), eq(roles.cuentaId, cuentaId.valor)));
    if (!fila) return null;
    const permisos = await tx
      .select({ permiso: rolPermisos.permiso })
      .from(rolPermisos)
      .where(eq(rolPermisos.rolId, fila.id));
    return Rol.reconstruir({
      ...fila,
      id: Identificador.desde(fila.id),
      cuentaId: Identificador.desde(fila.cuentaId),
      permisos: permisos.map((p) => p.permiso),
    });
  }

  async usoDe(rol: Rol): Promise<UsoDelRol> {
    const tx = transaccionEnCurso();
    const [asignados] = await tx
      .select({ total: count() })
      .from(empresaUsuarios)
      .where(eq(empresaUsuarios.rolId, rol.id.valor));
    const [conAccesoTotal] = await tx
      .select({ total: count() })
      .from(roles)
      .where(and(eq(roles.cuentaId, rol.cuentaId.valor), eq(roles.accesoTotal, true)));
    return { usuariosAsignados: asignados?.total ?? 0, rolesConAccesoTotal: conAccesoTotal?.total ?? 0 };
  }

  agregar(rol: Rol): Promise<void> {
    return insertarRol(transaccionEnCurso(), rol);
  }

  actualizar(rol: Rol): Promise<void> {
    return actualizarRol(transaccionEnCurso(), rol);
  }

  async eliminar(rol: Rol): Promise<void> {
    await transaccionEnCurso().delete(roles).where(eq(roles.id, rol.id.valor));
  }
}
