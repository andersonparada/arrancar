import { sql } from 'drizzle-orm';
import { check, foreignKey, index, uniqueIndex, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { departamentos } from '../../../empresas/infraestructura/persistencia/departamentos.tablas.js';
import { localidades } from '../../../empresas/infraestructura/persistencia/localidades.tablas.js';
import { activos } from './activos.tablas.js';

type Columnas = Record<
  | 'empresaId'
  | 'activoId'
  | 'esAlta'
  | 'grupoId'
  | 'numero'
  | 'anioDeNumero'
  | 'fecha'
  | 'localidadId'
  | 'departamentoId'
  | 'responsableUsuarioId'
  | 'recibidoPor'
  | 'motivo'
  | 'estado'
  | 'anuladoEn'
  | 'anuladoPor'
  | 'motivoDeAnulacion',
  AnyPgColumn
>;

/** Las llaves compuestas con la empresa: el activo y la ubicación son de la misma empresa que el traslado. */
export function llavesDeTraslado(t: Columnas) {
  return [
    foreignKey({
      name: 'traslados_activo_fk',
      columns: [t.activoId, t.empresaId],
      foreignColumns: [activos.id, activos.empresaId],
    }),
    foreignKey({
      name: 'traslados_localidad_fk',
      columns: [t.localidadId, t.empresaId],
      foreignColumns: [localidades.id, localidades.empresaId],
    }),
    foreignKey({
      name: 'traslados_departamento_fk',
      columns: [t.departamentoId, t.empresaId],
      foreignColumns: [departamentos.id, departamentos.empresaId],
    }),
  ];
}

/** Únicos e índices de §5.11: un alta por activo y un renglón por activo en cada boleta. */
export function indicesDeTraslado(t: Columnas) {
  const con = (columna: AnyPgColumn) => sql`${columna} is not null`;
  return [
    uniqueIndex('traslados_alta_unica')
      .on(t.activoId)
      .where(sql`${t.esAlta}`),
    index('traslados_activo_fecha_idx').on(t.activoId, t.fecha),
    index('traslados_grupo_idx').on(t.grupoId).where(con(t.grupoId)),
    index('traslados_localidad_idx').on(t.localidadId).where(con(t.localidadId)),
    index('traslados_departamento_idx').on(t.departamentoId).where(con(t.departamentoId)),
    index('traslados_usuario_idx').on(t.responsableUsuarioId).where(con(t.responsableUsuarioId)),
  ];
}

/** Los checks de §5.11 que la base garantiza aunque se escriba sin pasar por el dominio. */
export function reglasDeTraslado(t: Columnas) {
  return [
    check('traslados_alta_sin_boleta', sql`${t.esAlta} = (${t.numero} is null and ${t.grupoId} is null)`),
    check('traslados_numero_con_anio', sql`(${t.numero} is null) = (${t.anioDeNumero} is null)`),
    check('traslados_datos_de_entrega', sql`${t.esAlta} or (${t.recibidoPor} is not null and ${t.motivo} is not null)`),
    check('traslados_estado', sql`${t.estado} in ('vigente', 'anulado')`),
    check(
      'traslados_anulacion_completa',
      sql`(${t.estado} = 'anulado') = (${t.anuladoEn} is not null and ${t.anuladoPor} is not null and ${t.motivoDeAnulacion} is not null)`,
    ),
    check('traslados_motivo_largo', sql`${t.motivo} is null or char_length(btrim(${t.motivo})) between 1 and 300`),
  ];
}
