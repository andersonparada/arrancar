import { sql } from 'drizzle-orm';
import { foreignKey, index, uniqueIndex, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { departamentos } from '../../../empresas/infraestructura/persistencia/departamentos.tablas.js';
import { localidades } from '../../../empresas/infraestructura/persistencia/localidades.tablas.js';
import { clases } from './clases.tablas.js';

type Columnas = Record<
  | 'id'
  | 'empresaId'
  | 'codigo'
  | 'claseId'
  | 'activoPadreId'
  | 'estado'
  | 'altaConjuntaId'
  | 'localidadId'
  | 'departamentoId'
  | 'responsableUsuarioId'
  | 'fotoArchivoId'
  | 'enBodega'
  | 'numeroDeSerie',
  AnyPgColumn
>;

/** Las llaves compuestas con la empresa: ni la clase, ni el padre, ni la ubicación pueden ser de otra empresa. */
export function llavesDeActivo(t: Columnas) {
  return [
    foreignKey({
      name: 'activos_clase_fk',
      columns: [t.claseId, t.empresaId],
      foreignColumns: [clases.id, clases.empresaId],
    }),
    foreignKey({
      name: 'activos_padre_fk',
      columns: [t.activoPadreId, t.empresaId],
      foreignColumns: [t.id, t.empresaId],
    }),
    foreignKey({
      name: 'activos_localidad_fk',
      columns: [t.localidadId, t.empresaId],
      foreignColumns: [localidades.id, localidades.empresaId],
    }),
    foreignKey({
      name: 'activos_departamento_fk',
      columns: [t.departamentoId, t.empresaId],
      foreignColumns: [departamentos.id, departamentos.empresaId],
    }),
  ];
}

/** Únicos e índices de §5.3: el código y la foto no se repiten; todas las llaves llevan su índice. */
export function indicesDeActivo(t: Columnas) {
  const con = (columna: AnyPgColumn) => sql`${columna} is not null`;
  return [
    uniqueIndex('activos_codigo_unico').on(t.empresaId, sql`upper(${t.codigo})`),
    uniqueIndex('activos_foto_unica').on(t.fotoArchivoId).where(con(t.fotoArchivoId)),
    index('activos_existencias_idx').on(t.empresaId, t.claseId, t.estado),
    index('activos_padre_idx').on(t.activoPadreId).where(con(t.activoPadreId)),
    index('activos_localidad_idx').on(t.empresaId, t.localidadId).where(con(t.localidadId)),
    index('activos_departamento_idx').on(t.departamentoId).where(con(t.departamentoId)),
    index('activos_responsable_usuario_idx').on(t.responsableUsuarioId).where(con(t.responsableUsuarioId)),
    index('activos_en_bodega_idx')
      .on(t.empresaId)
      .where(sql`${t.enBodega} and ${t.estado} <> 'dado_de_baja'`),
    index('activos_alta_conjunta_idx').on(t.altaConjuntaId).where(con(t.altaConjuntaId)),
    index('activos_serie_idx')
      .on(t.empresaId, sql`upper(${t.numeroDeSerie})`)
      .where(con(t.numeroDeSerie)),
  ];
}
