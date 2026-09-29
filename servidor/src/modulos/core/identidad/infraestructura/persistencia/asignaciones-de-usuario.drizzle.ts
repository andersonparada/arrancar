import { and, eq, inArray } from 'drizzle-orm';
import {
  usuarioPermisos,
  usuarioRoles,
} from '../../../autorizacion/infraestructura/persistencia/permisos-de-usuario.tablas.js';
import { rolPermisos, roles } from '../../../autorizacion/infraestructura/persistencia/roles.tablas.js';
import { transaccionEnCurso } from '../../../compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  AsignacionesDeUsuario,
  AsignacionesPorId,
  CambiosDeAsignaciones,
} from '../../aplicacion/puertos/asignaciones-de-usuario.js';
import type { RolConPermisos } from '../../aplicacion/permisos-efectivos.js';

type Persona = { usuarioId: string; cuentaId: string };

/** Ninguna de las cuatro tablas tiene seguridad por filas: cada consulta filtra por `cuenta_id`. */
export class AsignacionesDeUsuarioDrizzle implements AsignacionesDeUsuario {
  async rolesDeLaCuenta(cuentaId: string): Promise<Map<string, RolConPermisos>> {
    const tx = transaccionEnCurso();
    const [filas, permisos] = await Promise.all([
      tx
        .select({ rolId: roles.id, nombre: roles.nombre, accesoTotal: roles.accesoTotal })
        .from(roles)
        .where(eq(roles.cuentaId, cuentaId)),
      tx
        .select({ rolId: rolPermisos.rolId, permiso: rolPermisos.permiso })
        .from(rolPermisos)
        .innerJoin(roles, eq(roles.id, rolPermisos.rolId))
        .where(eq(roles.cuentaId, cuentaId)),
    ]);
    const conPermisos = filas.map((fila) => ({
      ...fila,
      permisos: permisos.filter((p) => p.rolId === fila.rolId).map((p) => p.permiso),
    }));
    return new Map(conPermisos.map((rol) => [rol.rolId, rol]));
  }

  async delUsuario(usuarioId: string, cuentaId: string): Promise<AsignacionesPorId> {
    const tx = transaccionEnCurso();
    const [rolesDelUsuario, directos] = await Promise.all([
      tx
        .select({ rolId: usuarioRoles.rolId })
        .from(usuarioRoles)
        .where(and(eq(usuarioRoles.usuarioId, usuarioId), eq(usuarioRoles.cuentaId, cuentaId))),
      tx
        .select({ permiso: usuarioPermisos.permiso })
        .from(usuarioPermisos)
        .where(and(eq(usuarioPermisos.usuarioId, usuarioId), eq(usuarioPermisos.cuentaId, cuentaId))),
    ]);
    return { rolIds: rolesDelUsuario.map((r) => r.rolId), permisos: directos.map((p) => p.permiso) };
  }

  async cambiar(persona: Persona, cambios: CambiosDeAsignaciones): Promise<void> {
    await this.quitar(persona, cambios);
    await this.agregar(persona, cambios);
  }

  private async quitar({ usuarioId, cuentaId }: Persona, cambios: CambiosDeAsignaciones): Promise<void> {
    const tx = transaccionEnCurso();
    const delUsuario = (t: typeof usuarioRoles | typeof usuarioPermisos) =>
      and(eq(t.usuarioId, usuarioId), eq(t.cuentaId, cuentaId));
    if (cambios.rolesQuitados.length > 0) {
      await tx
        .delete(usuarioRoles)
        .where(and(delUsuario(usuarioRoles), inArray(usuarioRoles.rolId, [...cambios.rolesQuitados])));
    }
    if (cambios.permisosQuitados.length > 0) {
      await tx
        .delete(usuarioPermisos)
        .where(and(delUsuario(usuarioPermisos), inArray(usuarioPermisos.permiso, [...cambios.permisosQuitados])));
    }
  }

  private async agregar({ usuarioId, cuentaId }: Persona, cambios: CambiosDeAsignaciones): Promise<void> {
    const tx = transaccionEnCurso();
    if (cambios.rolesNuevos.length > 0) {
      await tx.insert(usuarioRoles).values(cambios.rolesNuevos.map((rolId) => ({ cuentaId, usuarioId, rolId })));
    }
    if (cambios.permisosNuevos.length > 0) {
      await tx
        .insert(usuarioPermisos)
        .values(cambios.permisosNuevos.map((permiso) => ({ cuentaId, usuarioId, permiso })));
    }
  }
}
