import { and, eq } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { MesDeConciliacionDto } from '../../aplicacion/dto/saldos-por-cuenta.dto.js';
import { conciliaciones } from './conciliaciones.tablas.js';

/**
 * El mes de cada conciliación autorizada (por su id), de una cuenta o de todas. Son pocas filas (una por cuenta y mes):
 * el reporte de movimientos las une en memoria con la marca de cada fila en vez de unir 100,000 movimientos en la base.
 */
export async function mesesDeConciliacionesAutorizadas(
  cuentaBancariaId?: string,
): Promise<Map<string, MesDeConciliacionDto>> {
  const filas = await transaccionEnCurso()
    .select({ id: conciliaciones.id, anio: conciliaciones.anio, mes: conciliaciones.mes })
    .from(conciliaciones)
    .where(
      and(
        eq(conciliaciones.estado, 'autorizada'),
        cuentaBancariaId ? eq(conciliaciones.cuentaBancariaId, cuentaBancariaId) : undefined,
      ),
    );
  return new Map(filas.map(({ id, anio, mes }) => [id, { anio, mes }]));
}
