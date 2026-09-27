import { eq } from 'drizzle-orm';
import type { Ejecutor } from '../../../base-datos/conexion.js';
import type { Rol } from '../../dominio/rol.js';
import { rolPermisos, roles } from './roles.tablas.js';

async function reemplazarPermisos(ejecutor: Ejecutor, rol: Rol): Promise<void> {
  const rolId = rol.id.valor;
  await ejecutor.delete(rolPermisos).where(eq(rolPermisos.rolId, rolId));
  const { permisos } = rol.instantanea();
  if (permisos.length > 0) await ejecutor.insert(rolPermisos).values(permisos.map((permiso) => ({ rolId, permiso })));
}

/**
 * Inserta el rol con sus permisos. Recibe el ejecutor porque el alta de cuentas
 * lo crea dentro de su propia transacción.
 */
export async function insertarRol(ejecutor: Ejecutor, rol: Rol): Promise<void> {
  const { id, cuentaId, nombre, descripcion, accesoTotal } = rol.instantanea();
  await ejecutor.insert(roles).values({ id: id.valor, cuentaId: cuentaId.valor, nombre, descripcion, accesoTotal });
  await reemplazarPermisos(ejecutor, rol);
}

export async function actualizarRol(ejecutor: Ejecutor, rol: Rol): Promise<void> {
  const { nombre, descripcion, accesoTotal } = rol.instantanea();
  await ejecutor.update(roles).set({ nombre, descripcion, accesoTotal }).where(eq(roles.id, rol.id.valor));
  await reemplazarPermisos(ejecutor, rol);
}
