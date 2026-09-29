import type { AccionAuditada, Auditoria } from '../../compartido/aplicacion/auditoria.js';
import type { PropiedadesDeRol } from '../dominio/rol.js';

type Datos = Pick<PropiedadesDeRol, 'nombre' | 'accesoTotal' | 'permisos'>;

/**
 * Deja en la auditoría (`core.permisos-de-rol`) lo que cambia en lo que puede hacer
 * un rol: cada permiso que se agrega o se quita y el acceso total que se da o se
 * retira. Cambiar el rol cambia lo que pueden hacer todos los usuarios que lo tienen.
 */
export async function auditarPermisosDeRol(
  auditoria: Auditoria,
  rolId: string,
  { antes, despues }: { antes: Datos; despues: Datos },
): Promise<void> {
  const rolNombre = despues.nombre;
  const registrar = (accion: AccionAuditada, anterior: object) =>
    auditoria.registrar({ recurso: 'core.permisos-de-rol', registroId: rolId, accion, anterior });
  if (antes.accesoTotal !== despues.accesoTotal) {
    await registrar(despues.accesoTotal ? 'asignar' : 'quitar', { rolId, rolNombre, accesoTotal: true });
  }
  for (const permiso of despues.permisos.filter((p) => !antes.permisos.includes(p))) {
    await registrar('asignar', { rolId, rolNombre, permiso });
  }
  for (const permiso of antes.permisos.filter((p) => !despues.permisos.includes(p))) {
    await registrar('quitar', { rolId, rolNombre, permiso });
  }
}
