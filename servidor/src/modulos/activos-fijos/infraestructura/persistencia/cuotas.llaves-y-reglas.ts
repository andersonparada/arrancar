import { sql } from 'drizzle-orm';
import { check, foreignKey, index, uniqueIndex, type AnyPgColumn, type ExtraConfigColumn } from 'drizzle-orm/pg-core';
import { departamentos } from '../../../empresas/infraestructura/persistencia/departamentos.tablas.js';
import { localidades } from '../../../empresas/infraestructura/persistencia/localidades.tablas.js';
import { activos } from './activos.tablas.js';
import { cierres } from './cierres.tablas.js';
import { tramos } from './tramos.tablas.js';

type Columnas = Record<
  'empresaId' | 'activoId' | 'libro' | 'tramoId' | 'monto' | 'acumulada' | 'localidadId' | 'departamentoId' | 'vigente',
  AnyPgColumn
> &
  Record<'periodo', ExtraConfigColumn>;

/** El cierre, el activo y el tramo son de la misma empresa que la cuota. */
function llavesDeOrigen(t: Columnas) {
  return [
    foreignKey({
      name: 'cuotas_cierre_fk',
      columns: [t.empresaId, t.periodo],
      foreignColumns: [cierres.empresaId, cierres.periodo],
    }),
    foreignKey({
      name: 'cuotas_activo_fk',
      columns: [t.activoId, t.empresaId],
      foreignColumns: [activos.id, activos.empresaId],
    }),
    foreignKey({
      name: 'cuotas_tramo_fk',
      columns: [t.tramoId, t.empresaId],
      foreignColumns: [tramos.id, tramos.empresaId],
    }),
  ];
}

/** La localidad y el departamento del centro de costo son de la misma empresa que la cuota. */
function llavesDeCentroDeCosto(t: Columnas) {
  return [
    foreignKey({
      name: 'cuotas_localidad_fk',
      columns: [t.localidadId, t.empresaId],
      foreignColumns: [localidades.id, localidades.empresaId],
    }),
    foreignKey({
      name: 'cuotas_departamento_fk',
      columns: [t.departamentoId, t.empresaId],
      foreignColumns: [departamentos.id, departamentos.empresaId],
    }),
  ];
}

/** Las llaves compuestas con la empresa: nada de otra empresa cabe en una cuota. */
export const llavesDeCuota = (t: Columnas) => [...llavesDeOrigen(t), ...llavesDeCentroDeCosto(t)];

/** Una sola cuota vigente por activo, libro y mes (repetir el cierre no duplica), y los índices del cierre y la ficha. */
export function indicesDeCuota(t: Columnas) {
  const vigente = sql`${t.vigente}`;
  const con = (columna: AnyPgColumn) => sql`${columna} is not null`;
  return [
    uniqueIndex('cuotas_vigente_unica').on(t.activoId, t.libro, t.periodo).where(vigente),
    index('cuotas_periodo_idx').on(t.empresaId, t.periodo).where(vigente),
    index('cuotas_activo_libro_idx').on(t.activoId, t.libro, t.periodo).where(vigente),
    index('cuotas_tramo_idx').on(t.tramoId),
    index('cuotas_localidad_idx').on(t.localidadId).where(con(t.localidadId)),
    index('cuotas_departamento_idx').on(t.departamentoId).where(con(t.departamentoId)),
  ];
}

/** Los checks de §5.10 que la base garantiza. */
export function reglasDeCuota(t: Columnas) {
  return [
    check('cuotas_libro', sql`${t.libro} in ('contable', 'fiscal')`),
    check('cuotas_primer_dia', sql`extract(day from ${t.periodo}) = 1`),
    check('cuotas_montos', sql`${t.monto} >= 0 and ${t.acumulada} >= 0`),
  ];
}
