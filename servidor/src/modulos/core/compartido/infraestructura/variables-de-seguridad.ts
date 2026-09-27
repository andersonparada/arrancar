import { sql } from 'drizzle-orm';
import type { Transaccion } from '../../base-datos/conexion.js';
import type { ContextoEmpresa } from '../aplicacion/contexto-empresa.js';

/**
 * Fija, solo para esta transacción, las variables que leen las políticas de Row
 * Level Security (`app.empresa_id`, `app.cuenta_id`, `app.usuario_id` y
 * `app.alcance_total`). Desde ese momento PostgreSQL solo deja ver y modificar
 * las filas de ese contexto, aunque la consulta no filtre.
 */
export async function fijarVariablesDeSeguridad(transaccion: Transaccion, contexto: ContextoEmpresa): Promise<void> {
  const alcanceTotal = (contexto.recursosAlcanceTotal ?? []).join(',');
  await transaccion.execute(
    sql`select set_config('app.empresa_id', ${contexto.empresaId}, true),
               set_config('app.cuenta_id', ${contexto.cuentaId}, true),
               set_config('app.usuario_id', ${contexto.usuarioId}, true),
               set_config('app.alcance_total', ${alcanceTotal}, true)`,
  );
}
