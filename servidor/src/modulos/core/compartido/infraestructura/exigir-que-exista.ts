import { eq } from 'drizzle-orm';
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import { RecursoNoEncontrado } from '../aplicacion/errores.js';
import { transaccionEnCurso } from './unidad-de-trabajo-postgres.js';

/**
 * Comprueba que el registro elegido exista en la transacción en curso. La
 * seguridad por filas oculta los de otra empresa o cuenta, así que tampoco se
 * puede apuntar a uno ajeno (la llave foránea sola no lo impide: PostgreSQL la
 * revisa sin RLS). Si no se eligió nada, no hay qué comprobar.
 * @throws RecursoNoEncontrado con el nombre del recurso: "El potrero no existe…".
 */
export async function exigirQueExista(
  tabla: PgTable & { id: PgColumn },
  id: string | null,
  recurso: string,
): Promise<void> {
  if (id === null) return;
  const [fila] = await transaccionEnCurso().select({ id: tabla.id }).from(tabla).where(eq(tabla.id, id));
  if (!fila) throw new RecursoNoEncontrado(recurso);
}
