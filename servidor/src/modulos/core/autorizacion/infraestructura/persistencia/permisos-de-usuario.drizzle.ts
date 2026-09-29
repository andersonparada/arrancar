import { and, eq } from 'drizzle-orm';
import type { BaseDatos } from '../../../base-datos/conexion.js';
import type { PermisosDeUsuario } from '../../../identidad/aplicacion/puertos/contextos-vecinos.js';
import type { AsignacionesDelUsuario, RolConPermisos } from '../../../identidad/aplicacion/permisos-efectivos.js';
import { usuarioPermisos, usuarioRoles } from './permisos-de-usuario.tablas.js';
import { rolPermisos, roles } from './roles.tablas.js';

interface FilaDeRol {
  rolId: string;
  nombre: string;
  accesoTotal: boolean;
  permiso: string | null;
}

/** Junta las filas (un rol por cada uno de sus permisos) en roles con su lista de permisos. */
function agruparRoles(filas: FilaDeRol[]): RolConPermisos[] {
  const porRol = new Map<string, RolConPermisos & { permisos: string[] }>();
  for (const { permiso, ...datos } of filas) {
    const rol = porRol.get(datos.rolId) ?? { ...datos, permisos: [] };
    if (permiso) rol.permisos.push(permiso);
    porRol.set(datos.rolId, rol);
  }
  return [...porRol.values()];
}

/**
 * Usa la conexión directa: la sesión pide los permisos antes de saber la empresa
 * activa. `usuario_roles`, `usuario_permisos`, `roles` y `rol_permisos` no tienen
 * seguridad por filas: cada consulta filtra por `cuenta_id`.
 */
export class PermisosDeUsuarioDrizzle implements PermisosDeUsuario {
  constructor(private readonly bd: BaseDatos) {}

  async enCuenta(usuarioId: string, cuentaId: string): Promise<AsignacionesDelUsuario> {
    const [filas, directos] = await Promise.all([
      this.filasDeRoles(usuarioId, cuentaId),
      this.directos(usuarioId, cuentaId),
    ]);
    return { roles: agruparRoles(filas), directos };
  }

  private filasDeRoles(usuarioId: string, cuentaId: string): Promise<FilaDeRol[]> {
    return this.bd
      .select({ rolId: roles.id, nombre: roles.nombre, accesoTotal: roles.accesoTotal, permiso: rolPermisos.permiso })
      .from(usuarioRoles)
      .innerJoin(roles, and(eq(roles.id, usuarioRoles.rolId), eq(roles.cuentaId, usuarioRoles.cuentaId)))
      .leftJoin(rolPermisos, eq(rolPermisos.rolId, roles.id))
      .where(and(eq(usuarioRoles.usuarioId, usuarioId), eq(usuarioRoles.cuentaId, cuentaId)));
  }

  private async directos(usuarioId: string, cuentaId: string): Promise<string[]> {
    const filas = await this.bd
      .select({ permiso: usuarioPermisos.permiso })
      .from(usuarioPermisos)
      .where(and(eq(usuarioPermisos.usuarioId, usuarioId), eq(usuarioPermisos.cuentaId, cuentaId)));
    return filas.map((fila) => fila.permiso);
  }
}
