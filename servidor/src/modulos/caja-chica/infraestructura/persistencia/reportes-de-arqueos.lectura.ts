import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { ArqueoDeReporte, FiltroDeArqueosDelPeriodo } from '../../aplicacion/puertos/puertos-de-reportes.js';
import type { DestinoDelFaltante } from '../../dominio/arqueos.js';
import { arqueos } from './arqueos.tablas.js';
import { comprobantes } from './comprobantes.tablas.js';
import { nombresDeFondos } from './reportes-de-comprobantes.lectura.js';
import { aArqueo } from './repositorio-de-arqueos.drizzle.js';

/** Lo que se decidió con el faltante de cada arqueo (el sobrante no tiene destino). */
async function destinosDe(ids: readonly string[]): Promise<Map<string, DestinoDelFaltante>> {
  if (ids.length === 0) return new Map();
  const filas = await transaccionEnCurso()
    .select({ arqueoId: comprobantes.arqueoId, destino: comprobantes.destinoDelFaltante })
    .from(comprobantes)
    .where(and(inArray(comprobantes.arqueoId, [...ids]), eq(comprobantes.clase, 'faltante')));
  return new Map(filas.flatMap(({ arqueoId, destino }) => (arqueoId && destino ? [[arqueoId, destino]] : [])));
}

/** CC-R5: los arqueos vigentes cuyo día de conteo (el de la zona horaria de la empresa) cae en el período. */
export async function arqueosDelPeriodoDe(filtro: FiltroDeArqueosDelPeriodo): Promise<ArqueoDeReporte[]> {
  const dia = sql`(${arqueos.realizadoEn} at time zone ${filtro.zonaHoraria})::date`;
  const filas = await transaccionEnCurso()
    .select()
    .from(arqueos)
    .where(
      and(
        eq(arqueos.estado, 'vigente'),
        sql`${dia} between ${filtro.desde}::date and ${filtro.hasta}::date`,
        filtro.fondoId ? eq(arqueos.fondoId, filtro.fondoId) : undefined,
      ),
    )
    .orderBy(asc(arqueos.realizadoEn), asc(arqueos.numero));
  const [destinos, nombres] = await Promise.all([
    destinosDe(filas.map(({ id }) => id)),
    nombresDeFondos([...new Set(filas.map(({ fondoId }) => fondoId))]),
  ]);
  return filas.map((fila) => ({
    arqueo: aArqueo(fila),
    fondoNombre: nombres.get(fila.fondoId) ?? '',
    destino: destinos.get(fila.id) ?? null,
  }));
}
