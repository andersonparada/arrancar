import { and, asc, desc, eq, gt, inArray, isNull, lte, notExists, or, sql } from 'drizzle-orm';
import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { EstadoDeFondoAlCorte, FiltroDeFondosAlCorte } from '../../aplicacion/puertos/puertos-de-reportes.js';
import { arqueos } from './arqueos.tablas.js';
import { cambiosDeMonto } from './cambios-de-monto.tablas.js';
import { comprobantes } from './comprobantes.tablas.js';
import { custodiosDeFondos } from './custodios-de-fondos.tablas.js';
import { fondos } from './fondos.tablas.js';
import { cubiertoAlCorte } from './reportes-de-comprobantes.lectura.js';
import { valesProvisionales } from './vales-provisionales.tablas.js';

/** Un total por fondo, en centavos. */
type TotalesPorFondo = Map<string, number>;

const aTotales = (filas: { fondoId: string | null; total: string | null }[]): TotalesPorFondo =>
  new Map(filas.flatMap(({ fondoId, total }) => (fondoId === null ? [] : [[fondoId, aCentavos(total ?? '0')]])));

/** El monto de cada fondo al corte: apertura y aumentos menos disminuciones, vigentes ese día. */
async function montosAlCorte(ids: readonly string[], corte: string): Promise<TotalesPorFondo> {
  const total = sql<string>`coalesce(sum(case when ${cambiosDeMonto.tipo} in ('apertura', 'aumento') then ${cambiosDeMonto.monto}
    when ${cambiosDeMonto.tipo} = 'disminucion' then -${cambiosDeMonto.monto} else 0 end), 0)::text`;
  const filas = await transaccionEnCurso()
    .select({ fondoId: cambiosDeMonto.fondoId, total })
    .from(cambiosDeMonto)
    .where(
      and(
        inArray(cambiosDeMonto.fondoId, [...ids]),
        lte(cambiosDeMonto.fecha, corte),
        or(eq(cambiosDeMonto.estado, 'vigente'), gt(cambiosDeMonto.fechaDeAnulacion, corte)),
      ),
    )
    .groupBy(cambiosDeMonto.fondoId);
  return aTotales(filas);
}

/** Los vales provisionales entregados al corte que seguían sin liquidar ni anular. */
function valeAbiertoAlCorte(corte: string) {
  return and(
    lte(valesProvisionales.fecha, corte),
    or(
      eq(valesProvisionales.estado, 'abierto'),
      and(eq(valesProvisionales.estado, 'liquidado'), gt(valesProvisionales.fechaDeLiquidacion, corte)),
      and(eq(valesProvisionales.estado, 'anulado'), gt(valesProvisionales.fechaDeAnulacion, corte)),
    ),
  );
}

/**
 * Los comprobantes de un vale que al corte seguía abierto: ya están contados dentro del vale, no como pendientes
 * (si no, el mismo efectivo se restaría dos veces).
 */
function sinContarEnUnValeAbierto(corte: string) {
  const delVale = transaccionEnCurso()
    .select({ uno: sql`1` })
    .from(valesProvisionales)
    .where(and(eq(valesProvisionales.id, comprobantes.valeProvisionalId), valeAbiertoAlCorte(corte)));
  return notExists(delVale);
}

/** Lo pendiente de reponer al corte (§5.10): las notas y los sobrantes restan. */
async function pendientesAlCorte(ids: readonly string[], corte: string): Promise<TotalesPorFondo> {
  const total = sql<string>`coalesce(sum(case when ${comprobantes.resta} then -${comprobantes.monto} else ${comprobantes.monto} end), 0)::text`;
  const filas = await transaccionEnCurso()
    .select({ fondoId: comprobantes.fondoId, total })
    .from(comprobantes)
    .where(
      and(
        inArray(comprobantes.fondoId, [...ids]),
        lte(comprobantes.fecha, corte),
        or(eq(comprobantes.estado, 'vigente'), gt(comprobantes.fechaDeAnulacion, corte)),
        cubiertoAlCorte(corte),
        sinContarEnUnValeAbierto(corte),
      ),
    )
    .groupBy(comprobantes.fondoId);
  return aTotales(filas);
}

/** Los vales provisionales que al corte ya se habían entregado y seguían sin liquidar ni anular. */
async function valesAbiertosAlCorte(ids: readonly string[], corte: string): Promise<TotalesPorFondo> {
  const total = sql<string>`coalesce(sum(${valesProvisionales.monto}), 0)::text`;
  const filas = await transaccionEnCurso()
    .select({ fondoId: valesProvisionales.fondoId, total })
    .from(valesProvisionales)
    .where(and(inArray(valesProvisionales.fondoId, [...ids]), valeAbiertoAlCorte(corte)))
    .groupBy(valesProvisionales.fondoId);
  return aTotales(filas);
}

/** El custodio de cada fondo ese día. */
async function custodiosAlCorte(ids: readonly string[], corte: string): Promise<Map<string, string>> {
  const filas = await transaccionEnCurso()
    .select({ fondoId: custodiosDeFondos.fondoId, custodio: custodiosDeFondos.custodio })
    .from(custodiosDeFondos)
    .where(
      and(
        inArray(custodiosDeFondos.fondoId, [...ids]),
        lte(custodiosDeFondos.desde, corte),
        or(isNull(custodiosDeFondos.hasta), gt(custodiosDeFondos.hasta, corte)),
      ),
    );
  return new Map(filas.map(({ fondoId, custodio }) => [fondoId, custodio]));
}

type UltimoArqueo = NonNullable<EstadoDeFondoAlCorte['ultimoArqueo']>;

/** Las columnas que se leen de cada arqueo para el reporte. */
const columnasDelUltimoArqueo = {
  fondoId: arqueos.fondoId,
  realizadoEn: sql<string>`to_char(${arqueos.realizadoEn} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`,
  diferencia: arqueos.diferencia,
};

/** El último arqueo de cada fondo que ese día estaba vigente y ya se había contado (por el día de la empresa). */
async function ultimosArqueosAlCorte(
  ids: readonly string[],
  por: { corte: string; zonaHoraria: string },
): Promise<Map<string, UltimoArqueo>> {
  const diaDelConteo = sql<string>`(${arqueos.realizadoEn} at time zone ${por.zonaHoraria})::date`;
  const filas = await transaccionEnCurso()
    .selectDistinctOn([arqueos.fondoId], columnasDelUltimoArqueo)
    .from(arqueos)
    .where(
      and(
        inArray(arqueos.fondoId, [...ids]),
        sql`${diaDelConteo} <= ${por.corte}::date`,
        or(eq(arqueos.estado, 'vigente'), gt(arqueos.fechaDeAnulacion, por.corte)),
      ),
    )
    .orderBy(arqueos.fondoId, desc(arqueos.realizadoEn));
  return new Map(
    filas.map((f) => [f.fondoId, { realizadoEn: f.realizadoEn, diferenciaCentavos: aCentavos(f.diferencia) }]),
  );
}

/** Los fondos que al corte ya estaban abiertos y no se habían cerrado. */
async function fondosAbiertosAlCorte({ corte, fondoId }: { corte: string; fondoId?: string }) {
  return transaccionEnCurso()
    .select({ id: fondos.id, nombre: fondos.nombre })
    .from(fondos)
    .where(
      and(
        lte(fondos.fechaDeApertura, corte),
        or(eq(fondos.estado, 'abierto'), gt(fondos.fechaDeCierre, corte)),
        fondoId ? eq(fondos.id, fondoId) : undefined,
      ),
    )
    .orderBy(asc(fondos.nombre));
}

/** CC-R4: los fondos abiertos al corte con su monto, pendiente, vales, custodio y último arqueo de ese día. */
export async function fondosAlCorteDe(filtro: FiltroDeFondosAlCorte): Promise<EstadoDeFondoAlCorte[]> {
  const abiertos = await fondosAbiertosAlCorte(filtro);
  if (abiertos.length === 0) return [];
  const ids = abiertos.map(({ id }) => id);
  const { corte, zonaHoraria } = filtro;
  const [montos, pendientes, vales, custodios, arqueosAlCorte] = await Promise.all([
    montosAlCorte(ids, corte),
    pendientesAlCorte(ids, corte),
    valesAbiertosAlCorte(ids, corte),
    custodiosAlCorte(ids, corte),
    ultimosArqueosAlCorte(ids, { corte, zonaHoraria }),
  ]);
  return abiertos.map(({ id, nombre }) => ({
    fondoId: id,
    nombre,
    custodio: custodios.get(id) ?? null,
    montoCentavos: montos.get(id) ?? 0,
    pendienteCentavos: pendientes.get(id) ?? 0,
    valesCentavos: vales.get(id) ?? 0,
    ultimoArqueo: arqueosAlCorte.get(id) ?? null,
  }));
}
