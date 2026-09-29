import { asc, count, eq } from 'drizzle-orm';
import type { BaseDatos } from '../../../base-datos/conexion.js';
import type { RolDto } from '../../aplicacion/dto/rol.dto.js';
import type { ConsultasRoles } from '../../aplicacion/puertos/consultas-roles.js';
import { usuarioRoles } from './permisos-de-usuario.tablas.js';
import { rolPermisos, roles } from './roles.tablas.js';

/** Las tablas no tienen seguridad por filas, así que siempre se filtra por cuenta o por rol. */
export class ConsultasRolesDrizzle implements ConsultasRoles {
  constructor(private readonly bd: BaseDatos) {}

  async listarDeCuenta(cuentaId: string): Promise<RolDto[]> {
    const [lista, permisos] = await Promise.all([this.rolesDe(cuentaId), this.permisosDeLaCuenta(cuentaId)]);
    return lista.map((rol) => ({
      ...rol,
      permisos: permisos.filter((p) => p.rolId === rol.id).map((p) => p.permiso),
    }));
  }

  private rolesDe(cuentaId: string) {
    return this.bd
      .select({
        id: roles.id,
        nombre: roles.nombre,
        descripcion: roles.descripcion,
        accesoTotal: roles.accesoTotal,
        totalUsuarios: count(usuarioRoles.usuarioId),
      })
      .from(roles)
      .leftJoin(usuarioRoles, eq(usuarioRoles.rolId, roles.id))
      .where(eq(roles.cuentaId, cuentaId))
      .groupBy(roles.id)
      .orderBy(asc(roles.nombre));
  }

  private permisosDeLaCuenta(cuentaId: string) {
    return this.bd
      .select({ rolId: rolPermisos.rolId, permiso: rolPermisos.permiso })
      .from(rolPermisos)
      .innerJoin(roles, eq(roles.id, rolPermisos.rolId))
      .where(eq(roles.cuentaId, cuentaId));
  }
}
