import { and, count, eq, inArray, isNull, ne, notExists, sql, type SQL } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import type { UsoDelFondo } from '../../dominio/fondos.js';
import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { arqueos } from './arqueos.tablas.js';
import { cambiosDeMonto } from './cambios-de-monto.tablas.js';
import { comprobantes } from './comprobantes.tablas.js';
import { custodiosDeFondos } from './custodios-de-fondos.tablas.js';
import { reposicionComprobantes } from './reposicion-comprobantes.tablas.js';
import { reposiciones } from './reposiciones.tablas.js';
import { valesProvisionales } from './vales-provisionales.tablas.js';

/** Un total por fondo, en centavos. */
export type TotalesPorFondo = Map<string, number>;

const aTotales = (filas: { fondoId: string | null; total: string | null }[]): TotalesPorFondo =>
  new Map(filas.flatMap(({ fondoId, total }) => (fondoId === null ? [] : [[fondoId, aCentavos(total ?? '0')]])));

/** El monto de cada fondo: apertura y aumentos vigentes menos disminuciones vigentes. */
export async function montosDe(ids: readonly string[]): Promise<TotalesPorFondo> {
  const total = sql<string>`coalesce(sum(case when ${cambiosDeMonto.tipo} in ('apertura', 'aumento') then ${cambiosDeMonto.monto}
    when ${cambiosDeMonto.tipo} = 'disminucion' then -${cambiosDeMonto.monto} else 0 end), 0)::text`;
  const filas = await transaccionEnCurso()
    .select({ fondoId: cambiosDeMonto.fondoId, total })
    .from(cambiosDeMonto)
    .where(and(inArray(cambiosDeMonto.fondoId, [...ids]), eq(cambiosDeMonto.estado, 'vigente')))
    .groupBy(cambiosDeMonto.fondoId);
  return aTotales(filas);
}

/** Los fondos cuya apertura se anuló. */
export async function aperturasAnuladasDe(ids: readonly string[]): Promise<Set<string>> {
  const filas = await transaccionEnCurso()
    .select({ fondoId: cambiosDeMonto.fondoId })
    .from(cambiosDeMonto)
    .where(
      and(
        inArray(cambiosDeMonto.fondoId, [...ids]),
        eq(cambiosDeMonto.tipo, 'apertura'),
        eq(cambiosDeMonto.estado, 'anulado'),
      ),
    );
  return new Set(filas.map(({ fondoId }) => fondoId));
}

/** Lo pendiente de reponer: comprobantes vigentes que no están en una reposición vigente (las notas y sobrantes restan). */
export async function pendientesDe(ids: readonly string[]): Promise<TotalesPorFondo> {
  const total = sql<string>`coalesce(sum(case when ${comprobantes.resta} then -${comprobantes.monto} else ${comprobantes.monto} end), 0)::text`;
  const repuesto = transaccionEnCurso()
    .select({ uno: sql`1` })
    .from(reposicionComprobantes)
    .where(and(eq(reposicionComprobantes.comprobanteId, comprobantes.id), eq(reposicionComprobantes.vigente, true)));
  const filas = await transaccionEnCurso()
    .select({ fondoId: comprobantes.fondoId, total })
    .from(comprobantes)
    .where(and(inArray(comprobantes.fondoId, [...ids]), eq(comprobantes.estado, 'vigente'), notExists(repuesto)))
    .groupBy(comprobantes.fondoId);
  return aTotales(filas);
}

/** Lo entregado en vales provisionales que siguen abiertos. */
export async function valesAbiertosDe(ids: readonly string[]): Promise<TotalesPorFondo> {
  const total = sql<string>`coalesce(sum(${valesProvisionales.monto}), 0)::text`;
  const filas = await transaccionEnCurso()
    .select({ fondoId: valesProvisionales.fondoId, total })
    .from(valesProvisionales)
    .where(and(inArray(valesProvisionales.fondoId, [...ids]), eq(valesProvisionales.estado, 'abierto')))
    .groupBy(valesProvisionales.fondoId);
  return aTotales(filas);
}

/** El último arqueo vigente de cada fondo, como fecha y hora ISO. */
export async function ultimosArqueosDe(ids: readonly string[]): Promise<Map<string, string>> {
  const ultimo = sql<string>`to_char(max(${arqueos.realizadoEn}) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;
  const filas = await transaccionEnCurso()
    .select({ fondoId: arqueos.fondoId, ultimo })
    .from(arqueos)
    .where(and(inArray(arqueos.fondoId, [...ids]), eq(arqueos.estado, 'vigente')))
    .groupBy(arqueos.fondoId);
  return new Map(filas.map(({ fondoId, ultimo: fecha }) => [fondoId, fecha]));
}

/** El custodio vigente de cada fondo. */
export async function custodiosVigentesDe(ids: readonly string[]) {
  const filas = await transaccionEnCurso()
    .select({
      fondoId: custodiosDeFondos.fondoId,
      custodio: custodiosDeFondos.custodio,
      usuarioId: custodiosDeFondos.custodioUsuarioId,
    })
    .from(custodiosDeFondos)
    .where(and(inArray(custodiosDeFondos.fondoId, [...ids]), isNull(custodiosDeFondos.hasta)));
  return new Map(filas.map((fila) => [fila.fondoId, fila]));
}

const contar = async (tabla: PgTable, condicion: SQL | undefined): Promise<number> => {
  const [fila] = await transaccionEnCurso().select({ total: count() }).from(tabla).where(condicion);
  return fila?.total ?? 0;
};

/** Cuánto tiene ya el fondo: comprobantes vigentes, arqueos vigentes, reposiciones vigentes y vales sin anular. */
export async function usoDe(id: string): Promise<UsoDelFondo> {
  const [cantidadDeComprobantes, cantidadDeArqueos, cantidadDeReposiciones, cantidadDeVales] = await Promise.all([
    contar(comprobantes, and(eq(comprobantes.fondoId, id), eq(comprobantes.estado, 'vigente'))),
    contar(arqueos, and(eq(arqueos.fondoId, id), eq(arqueos.estado, 'vigente'))),
    contar(reposiciones, and(eq(reposiciones.fondoId, id), eq(reposiciones.estado, 'vigente'))),
    contar(valesProvisionales, and(eq(valesProvisionales.fondoId, id), ne(valesProvisionales.estado, 'anulado'))),
  ]);
  return {
    comprobantes: cantidadDeComprobantes,
    arqueos: cantidadDeArqueos,
    reposiciones: cantidadDeReposiciones,
    vales: cantidadDeVales,
  };
}
