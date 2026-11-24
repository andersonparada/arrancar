import { sql } from 'drizzle-orm';
import { check, foreignKey, index, unique, uniqueIndex, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { CATEGORIAS_DE_IUSI, FUENTES_DE_VALOR, ORIGENES_DE_VALOR } from '../../dominio/tipos-de-valor-de-inmueble.js';
import { inmuebles } from './inmuebles.tablas.js';

type Columnas = Record<
  | 'id'
  | 'empresaId'
  | 'inmuebleId'
  | 'archivoId'
  | 'fuente'
  | 'vigenteDesde'
  | 'origen'
  | 'valorTerreno'
  | 'valorConstrucciones'
  | 'valorCultivosPermanentes'
  | 'valorTotal'
  | 'categoriaIusi'
  | 'documento',
  AnyPgColumn
>;

const lista = (valores: readonly string[]) => sql.raw(valores.map((valor) => `'${valor}'`).join(', '));

/** Las reglas de forma del valor; el dominio y Zod las repiten para dar mensajes claros. */
export const restriccionesDeValoresDeInmueble = (t: Columnas) => [
  check('valores_de_inmueble_fuente_valida', sql`${t.fuente} in (${lista(FUENTES_DE_VALOR)})`),
  check('valores_de_inmueble_origen_valido', sql`${t.origen} in (${lista(ORIGENES_DE_VALOR)})`),
  check(
    'valores_de_inmueble_partes_no_negativas',
    sql`(${t.valorTerreno} is null or ${t.valorTerreno} >= 0) and (${t.valorConstrucciones} is null or ${t.valorConstrucciones} >= 0) and (${t.valorCultivosPermanentes} is null or ${t.valorCultivosPermanentes} >= 0)`,
  ),
  check('valores_de_inmueble_total_positivo', sql`${t.valorTotal} > 0`),
  check(
    'valores_de_inmueble_total_coherente',
    sql`coalesce(${t.valorTerreno}, 0) + coalesce(${t.valorConstrucciones}, 0) + coalesce(${t.valorCultivosPermanentes}, 0) <= ${t.valorTotal} and (${t.valorTerreno} is null or ${t.valorConstrucciones} is null or ${t.valorCultivosPermanentes} is null or ${t.valorTerreno} + ${t.valorConstrucciones} + ${t.valorCultivosPermanentes} = ${t.valorTotal})`,
  ),
  check(
    'valores_de_inmueble_categoria_valida',
    sql`${t.categoriaIusi} is null or (${t.categoriaIusi} in (${lista(CATEGORIAS_DE_IUSI)}) and ${t.fuente} = 'matricula_fiscal')`,
  ),
  check(
    'valores_de_inmueble_documento_valido',
    sql`${t.documento} is null or char_length(trim(${t.documento})) between 1 and 150`,
  ),
];

/** Llaves compuestas que no cruzan de empresa, únicos y el índice de la serie. */
export const llavesEIndicesDeValoresDeInmueble = (t: Columnas) => [
  foreignKey({
    name: 'valores_de_inmueble_inmueble_fk',
    columns: [t.inmuebleId, t.empresaId],
    foreignColumns: [inmuebles.id, inmuebles.empresaId],
  }).onDelete('cascade'),
  unique('valores_de_inmueble_id_empresa_unico').on(t.id, t.empresaId),
  unique('valores_de_inmueble_fecha_unico').on(t.inmuebleId, t.fuente, t.vigenteDesde),
  index('valores_de_inmueble_serie_idx').on(t.inmuebleId, t.fuente, sql`${t.vigenteDesde} desc`),
  uniqueIndex('valores_de_inmueble_archivo_unico')
    .on(t.archivoId)
    .where(sql`${t.archivoId} is not null`),
];
