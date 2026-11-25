import { and, eq } from 'drizzle-orm';
import {
  contextoEnCurso,
  transaccionEnCurso,
} from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { configuracion } from '../../../core/configuracion/contexto.js';
import { periodos } from '../../../libro-de-compras/infraestructura/persistencia/periodos.tablas.js';
import type { ControlDePeriodosParaVentas, EstadoDelPeriodo } from '../../aplicacion/puertos/puertos-de-documentos.js';

/** La variable de Libro de compras que enciende el bloqueo de los períodos declarados (la ley y la declaración son una sola). */
export const CLAVE_DEL_CONTROL_DE_PERIODOS = 'libro-de-compras.periodos.control_de_declarados';

/**
 * Los períodos declarados los lleva Libro de compras (la declaración del SAT-2237 es una sola, con débito y crédito) y
 * aquí solo se lee su estado. Con el bloqueo encendido, `bloquear` crea la fila abierta si falta y la toma con
 * `for share`, así declarar (`for update`) espera a los registros en curso y los registros posteriores ven el
 * período declarado. Con el bloqueo apagado nunca escribe.
 */
export class ControlDePeriodosParaVentasDrizzle implements ControlDePeriodosParaVentas {
  async estadoDe(periodo: string, bloquear: boolean): Promise<EstadoDelPeriodo> {
    const { cuentaId, empresaId } = contextoEnCurso();
    const encendido = await configuracion.lector.obtener<boolean>(CLAVE_DEL_CONTROL_DE_PERIODOS, {
      cuentaId,
      empresaId,
    });
    const transaccion = transaccionEnCurso();
    if (encendido && bloquear) await transaccion.insert(periodos).values({ empresaId, periodo }).onConflictDoNothing();
    const consulta = transaccion
      .select({ estado: periodos.estado })
      .from(periodos)
      .where(and(eq(periodos.empresaId, empresaId), eq(periodos.periodo, periodo)));
    const [fila] = encendido && bloquear ? await consulta.for('share') : await consulta;
    const declarado = fila?.estado === 'declarado';
    return { declarado, bloquea: declarado && encendido };
  }
}
