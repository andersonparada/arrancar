import { and, asc, count, eq } from 'drizzle-orm';
import { bd, type Ejecutor } from '../base-datos/conexion.js';
import { rolPermisos, roles } from '../esquemas/roles.esquema.js';
import { empresaUsuarios } from '../esquemas/empresas.esquema.js';

export type Rol = typeof roles.$inferSelect;

export interface RolConPermisos extends Rol {
  permisos: string[];
  totalUsuarios: number;
}

export interface DatosRol {
  nombre: string;
  descripcion?: string | null;
  accesoTotal: boolean;
  permisos: string[];
}

export const rolesRepositorio = {
  async listarDeCuenta(cuentaId: string): Promise<RolConPermisos[]> {
    const listaRoles = await bd
      .select({
        id: roles.id,
        cuentaId: roles.cuentaId,
        nombre: roles.nombre,
        descripcion: roles.descripcion,
        accesoTotal: roles.accesoTotal,
        creadoEn: roles.creadoEn,
        actualizadoEn: roles.actualizadoEn,
        totalUsuarios: count(empresaUsuarios.usuarioId),
      })
      .from(roles)
      .leftJoin(empresaUsuarios, eq(empresaUsuarios.rolId, roles.id))
      .where(eq(roles.cuentaId, cuentaId))
      .groupBy(roles.id)
      .orderBy(asc(roles.nombre));

    const permisos = await bd
      .select({ rolId: rolPermisos.rolId, permiso: rolPermisos.permiso })
      .from(rolPermisos)
      .innerJoin(roles, eq(roles.id, rolPermisos.rolId))
      .where(eq(roles.cuentaId, cuentaId));

    return listaRoles.map((rol) => ({
      ...rol,
      permisos: permisos.filter((p) => p.rolId === rol.id).map((p) => p.permiso),
    }));
  },

  async buscarDeCuenta(id: string, cuentaId: string, ejecutor: Ejecutor = bd): Promise<Rol | undefined> {
    const [rol] = await ejecutor
      .select()
      .from(roles)
      .where(and(eq(roles.id, id), eq(roles.cuentaId, cuentaId)));
    return rol;
  },

  async permisosDe(rolId: string, ejecutor: Ejecutor = bd): Promise<string[]> {
    const filas = await ejecutor
      .select({ permiso: rolPermisos.permiso })
      .from(rolPermisos)
      .where(eq(rolPermisos.rolId, rolId));
    return filas.map((f) => f.permiso);
  },

  async crear(cuentaId: string, datos: DatosRol, ejecutor: Ejecutor = bd): Promise<Rol> {
    const [rol] = await ejecutor
      .insert(roles)
      .values({ cuentaId, nombre: datos.nombre, descripcion: datos.descripcion, accesoTotal: datos.accesoTotal })
      .returning();
    await this.reemplazarPermisos(rol!.id, datos.permisos, ejecutor);
    return rol!;
  },

  async actualizar(id: string, datos: DatosRol, ejecutor: Ejecutor = bd): Promise<void> {
    await ejecutor
      .update(roles)
      .set({ nombre: datos.nombre, descripcion: datos.descripcion, accesoTotal: datos.accesoTotal })
      .where(eq(roles.id, id));
    await this.reemplazarPermisos(id, datos.permisos, ejecutor);
  },

  async eliminar(id: string): Promise<void> {
    await bd.delete(roles).where(eq(roles.id, id));
  },

  async reemplazarPermisos(rolId: string, permisos: string[], ejecutor: Ejecutor = bd): Promise<void> {
    await ejecutor.delete(rolPermisos).where(eq(rolPermisos.rolId, rolId));
    if (permisos.length > 0) {
      await ejecutor.insert(rolPermisos).values([...new Set(permisos)].map((permiso) => ({ rolId, permiso })));
    }
  },
};
