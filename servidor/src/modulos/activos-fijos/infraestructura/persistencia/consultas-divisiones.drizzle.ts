import { and, desc, eq, or, sql, type SQL } from 'drizzle-orm';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import { aCentavos, deCentavos } from '../../../core/compartido/dominio/centavos.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { DivisionDto } from '../../aplicacion/dto/division.dto.js';
import type { ConsultasDivisiones } from '../../aplicacion/puertos/consultas-divisiones.js';
import { divisiones } from './divisiones.tablas.js';

type Fila = typeof divisiones.$inferSelect;

const dinero = (monto: string): string => deCentavos(aCentavos(monto));

function aDto(fila: Fila): DivisionDto {
  return {
    id: fila.id,
    activoOrigenId: fila.activoOrigenId,
    activoNuevoId: fila.activoNuevoId,
    codigoDelActivoNuevo: fila.codigoDelActivoNuevo,
    fecha: fila.fecha,
    periodo: fila.periodo,
    cantidadOriginal: fila.cantidadOriginal,
    cantidadSeparada: fila.cantidadSeparada,
    causa: fila.causa,
    motivo: fila.motivo,
    costoSeparado: dinero(fila.costoSeparado),
    costoFiscalSeparado: dinero(fila.costoFiscalSeparado),
    acumuladaContableSeparada: dinero(fila.acumuladaContableSeparada),
    acumuladaFiscalSeparada: dinero(fila.acumuladaFiscalSeparada),
    residualSeparado: dinero(fila.residualSeparado),
    estado: fila.estado,
    anuladoEn: fila.anuladoEn?.toISOString() ?? null,
    motivoDeAnulacion: fila.motivoDeAnulacion,
  };
}

const delActivo = (activoId: string): SQL =>
  or(eq(divisiones.activoOrigenId, activoId), eq(divisiones.activoNuevoId, activoId))!;

/**
 * Los movimientos que impiden anular una división (§6.11): de los dos activos, lo creado después de ella. Las filas de la
 * propia división (costos, tramos) llevan su `division_id` y no cuentan. Todos los `creado_en` que se comparan son la hora
 * real (`horaReal`) y se guardan con el activo bloqueado, así que lo posterior a la división tiene siempre una hora mayor.
 */
const MOVIMIENTOS_POSTERIORES = (divisionId: string) => sql`
  with d as (
    select id, activo_origen_id as origen, activo_nuevo_id as nuevo, creado_en as desde, periodo
    from activos_fijos.divisiones where id = ${divisionId}
  )
  select (
    exists (select 1 from activos_fijos.traslados t, d
      where t.activo_id in (d.origen, d.nuevo) and not t.es_alta and t.estado = 'vigente' and t.creado_en > d.desde)
    or exists (select 1 from activos_fijos.mejoras m, d
      where m.activo_id in (d.origen, d.nuevo) and m.estado = 'vigente' and m.creado_en > d.desde)
    or exists (select 1 from activos_fijos.bajas b, d
      where b.activo_id in (d.origen, d.nuevo) and b.estado = 'vigente')
    or exists (select 1 from activos_fijos.divisiones x, d
      where x.estado = 'vigente' and x.id <> d.id and x.creado_en > d.desde
        and (x.activo_origen_id in (d.origen, d.nuevo) or x.activo_nuevo_id in (d.origen, d.nuevo)))
    or exists (select 1 from activos_fijos.tramos t, d
      where t.vigente and t.division_id is null and t.activo_id in (d.origen, d.nuevo) and t.creado_en > d.desde)
    or exists (select 1 from activos_fijos.costos c, d
      where c.estado = 'vigente' and c.division_id is null and c.activo_id in (d.origen, d.nuevo) and c.creado_en > d.desde)
    or exists (select 1 from activos_fijos.cuotas q, d
      where q.vigente and (q.activo_id = d.nuevo or (q.activo_id = d.origen and q.periodo >= d.periodo)))
  ) as hay`;

/** Lecturas de las divisiones. */
export class ConsultasDivisionesDrizzle implements ConsultasDivisiones {
  async obtener(divisionId: string): Promise<DivisionDto> {
    const [fila] = await transaccionEnCurso().select().from(divisiones).where(eq(divisiones.id, divisionId));
    if (!fila) throw new RecursoNoEncontrado('La división');
    return aDto(fila);
  }

  async deActivo(activoId: string): Promise<DivisionDto[]> {
    const filas = await transaccionEnCurso()
      .select()
      .from(divisiones)
      .where(delActivo(activoId))
      .orderBy(desc(divisiones.fecha), desc(divisiones.creadoEn));
    return filas.map(aDto);
  }

  async fechaDeLaUltimaDeActivo(activoId: string): Promise<string | null> {
    const [fila] = await transaccionEnCurso()
      .select({ fecha: divisiones.fecha })
      .from(divisiones)
      .where(and(delActivo(activoId), eq(divisiones.estado, 'vigente')))
      .orderBy(desc(divisiones.fecha))
      .limit(1);
    return fila?.fecha ?? null;
  }

  async hayMovimientosPosteriores(divisionId: string): Promise<boolean> {
    const resultado = await transaccionEnCurso().execute<{ hay: boolean }>(MOVIMIENTOS_POSTERIORES(divisionId));
    return resultado.rows[0]?.hay === true;
  }

  async tieneMejorasOBajas(activoId: string): Promise<boolean> {
    const resultado = await transaccionEnCurso().execute<{ hay: boolean }>(sql`
      select (exists (select 1 from activos_fijos.mejoras where activo_id = ${activoId})
        or exists (select 1 from activos_fijos.bajas where activo_id = ${activoId})) as hay`);
    return resultado.rows[0]?.hay === true;
  }
}
