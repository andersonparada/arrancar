import { sql } from 'drizzle-orm';
import { check, foreignKey, index, uniqueIndex, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { lineasDeDocumento } from '../../../libro-de-compras/infraestructura/persistencia/lineas-de-documento.tablas.js';
import { CLASES_DE_COSTO_ELEGIBLES, ESTADOS_DE_COSTO, ORIGENES_DE_COSTO } from '../../dominio/tipos-de-costo.js';
import { activos } from './activos.tablas.js';

type Columnas = Record<
  | 'id'
  | 'empresaId'
  | 'activoId'
  | 'origen'
  | 'claseDeCosto'
  | 'documentoDeCompraId'
  | 'lineaDeDocumentoId'
  | 'monto'
  | 'aplicaAlLibroFiscal'
  | 'motivoFueraDelLibroFiscal'
  | 'documentoDeSoporte'
  | 'archivoId'
  | 'descripcion'
  | 'estado'
  | 'anuladoEn'
  | 'anuladoPor'
  | 'motivoDeAnulacion',
  AnyPgColumn
>;

const enSql = (valores: readonly string[]) => sql.raw(valores.map((valor) => `'${valor}'`).join(', '));

/** Las llaves compuestas con la empresa: el activo y la línea del libro son de la misma empresa (y la línea, de su documento). */
export function llavesDeCosto(t: Columnas) {
  return [
    foreignKey({
      name: 'costos_activo_fk',
      columns: [t.activoId, t.empresaId],
      foreignColumns: [activos.id, activos.empresaId],
    }),
    foreignKey({
      name: 'costos_linea_fk',
      columns: [t.lineaDeDocumentoId, t.documentoDeCompraId, t.empresaId],
      foreignColumns: [lineasDeDocumento.id, lineasDeDocumento.documentoId, lineasDeDocumento.empresaId],
    }),
  ];
}

/** Índices de §5.4: por activo y estado, por línea y por documento (para el aviso de anulación). */
export function indicesDeCosto(t: Columnas) {
  const con = (columna: AnyPgColumn) => sql`${columna} is not null`;
  return [
    index('costos_activo_estado_idx').on(t.activoId, t.estado),
    index('costos_linea_idx').on(t.lineaDeDocumentoId).where(con(t.lineaDeDocumentoId)),
    index('costos_documento_idx').on(t.documentoDeCompraId).where(con(t.documentoDeCompraId)),
    uniqueIndex('costos_archivo_unico').on(t.archivoId).where(con(t.archivoId)),
    uniqueIndex('costos_saldo_inicial_unico')
      .on(t.activoId)
      .where(sql`${t.origen} = 'saldo_inicial' and ${t.estado} = 'vigente'`),
  ];
}

/** Los checks de §5.4 que la base garantiza aunque se escriba sin pasar por el dominio. */
export function reglasDeCosto(t: Columnas) {
  return [...reglasDeValores(t), ...reglasFiscalesYDeAnulacion(t)];
}

function reglasDeValores(t: Columnas) {
  return [
    check('costos_origen', sql`${t.origen} in (${enSql(ORIGENES_DE_COSTO)})`),
    check(
      'costos_clase_de_costo',
      sql`${t.claseDeCosto} in (${enSql([...CLASES_DE_COSTO_ELEGIBLES, 'nota_de_credito', 'nota_de_debito'])})`,
    ),
    check('costos_estado', sql`${t.estado} in (${enSql(ESTADOS_DE_COSTO)})`),
    check(
      'costos_monto_con_signo',
      sql`${t.monto} <> 0 and (${t.monto} < 0) = (${t.claseDeCosto} = 'nota_de_credito')`,
    ),
    check(
      'costos_de_linea_completo',
      sql`(${t.origen} = 'linea_de_compra') = (${t.lineaDeDocumentoId} is not null and ${t.documentoDeCompraId} is not null)`,
    ),
    check('costos_linea_y_documento', sql`(${t.lineaDeDocumentoId} is null) = (${t.documentoDeCompraId} is null)`),
  ];
}

function reglasFiscalesYDeAnulacion(t: Columnas) {
  return [
    check('costos_fuera_del_libro_fiscal', sql`${t.aplicaAlLibroFiscal} = (${t.motivoFueraDelLibroFiscal} is null)`),
    check('costos_fuera_del_libro_solo_manual', sql`${t.aplicaAlLibroFiscal} or ${t.origen} = 'manual'`),
    check('costos_manual_con_soporte', sql`${t.origen} <> 'manual' or ${t.documentoDeSoporte} is not null`),
    check(
      'costos_textos_largos',
      sql`(${t.motivoFueraDelLibroFiscal} is null or char_length(btrim(${t.motivoFueraDelLibroFiscal})) between 1 and 300)
        and (${t.documentoDeSoporte} is null or char_length(btrim(${t.documentoDeSoporte})) between 1 and 150)
        and (${t.descripcion} is null or char_length(btrim(${t.descripcion})) between 1 and 300)`,
    ),
    check(
      'costos_anulacion_completa',
      sql`(${t.estado} = 'anulado') = (${t.anuladoEn} is not null and ${t.anuladoPor} is not null and ${t.motivoDeAnulacion} is not null)`,
    ),
  ];
}
