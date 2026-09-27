import { sql } from 'drizzle-orm';
import { bd, type Transaccion } from './conexion.js';

export interface ContextoEmpresa {
  empresaId: string;
  /** Cuenta a la que pertenece la empresa activa; fija `app.cuenta_id` para `politicaPorCuenta()`. */
  cuentaId: string;
  usuarioId: string;
  /**
   * Recursos con alcance (p. ej. `bancos.cuentas`) cuyos registros el usuario ve
   * completos. Para los demás, solo ve los asignados en `core.accesos_datos`.
   */
  recursosAlcanceTotal?: readonly string[];
}

/**
 * Ejecuta una operación dentro de una transacción ligada a una empresa.
 *
 * Fija `app.empresa_id`, `app.cuenta_id`, `app.usuario_id` y `app.alcance_total`
 * solo para esa transacción; las políticas de Row Level Security usan esos
 * valores, así que cualquier consulta hecha con `tx` únicamente ve y modifica
 * filas de la empresa indicada (o de su cuenta, en las tablas compartidas por
 * cuenta) y, en los recursos con alcance, solo las asignadas al usuario.
 */
export async function ejecutarEnEmpresa<T>(
  contexto: ContextoEmpresa,
  operacion: (tx: Transaccion) => Promise<T>,
): Promise<T> {
  const alcanceTotal = (contexto.recursosAlcanceTotal ?? []).join(',');
  return bd.transaction(async (tx) => {
    await tx.execute(
      sql`select set_config('app.empresa_id', ${contexto.empresaId}, true),
                 set_config('app.cuenta_id', ${contexto.cuentaId}, true),
                 set_config('app.usuario_id', ${contexto.usuarioId}, true),
                 set_config('app.alcance_total', ${alcanceTotal}, true)`,
    );
    return operacion(tx);
  });
}
