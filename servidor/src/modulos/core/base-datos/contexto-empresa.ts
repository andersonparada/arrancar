import type { ContextoEmpresa } from '../compartido/aplicacion/contexto-empresa.js';
import { fijarVariablesDeSeguridad } from '../compartido/infraestructura/variables-de-seguridad.js';
import { bd, type Transaccion } from './conexion.js';

export type { ContextoEmpresa };

/**
 * Ejecuta una operación en una transacción con las variables de seguridad del
 * contexto: las consultas hechas con `tx` solo ven las filas de ese contexto.
 *
 * @deprecated El código nuevo usa `UnidadDeTrabajo` (core/compartido). Se retira
 * cuando los módulos existentes terminen de migrar (fase 5).
 */
export async function ejecutarEnEmpresa<T>(
  contexto: ContextoEmpresa,
  operacion: (tx: Transaccion) => Promise<T>,
): Promise<T> {
  return bd.transaction(async (tx) => {
    await fijarVariablesDeSeguridad(tx, contexto);
    return operacion(tx);
  });
}
