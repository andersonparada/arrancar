import { sql } from 'drizzle-orm';
import { check, foreignKey, index, unique, uniqueIndex, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { nombreNormalizado } from '../../../core/base-datos/nombre-normalizado.js';
import { municipios } from '../../../core/geografia/infraestructura/persistencia/geografia.tablas.js';
import { localidades } from './localidades.tablas.js';

type Columnas = Record<
  | 'nombre'
  | 'situacionRegistral'
  | 'registro'
  | 'numeroDeFinca'
  | 'folio'
  | 'libro'
  | 'departamentoRegistral'
  | 'documentoPosesorio'
  | 'titulacionSupletoriaEnTramite'
  | 'titularidad'
  | 'porcentajeDeCopropiedad'
  | 'titular'
  | 'matriculaFiscal'
  | 'administraIusi'
  | 'codigoCatastral'
  | 'departamentoCodigo'
  | 'municipioCodigo'
  | 'direccion'
  | 'superficieRegistralM2'
  | 'cantidadOriginal'
  | 'unidadOriginal'
  | 'varasPorLadoDeCuerda'
  | 'observaciones',
  AnyPgColumn
>;

const FORMA_DE_LOS_NUMEROS = '^[A-Za-z0-9 ./-]+$';

/** Texto opcional de entre 1 y `largo` caracteres. */
const textoOpcionalDe = (columna: AnyPgColumn, largo: number) =>
  sql`${columna} is null or char_length(trim(${columna})) between 1 and ${sql.raw(String(largo))}`;

/** Un dato del registro: de 1 a 20 caracteres, letras, dígitos, espacio, punto, diagonal y guion. */
const datoDelRegistro = (columna: AnyPgColumn) =>
  sql`${columna} is null or (char_length(${columna}) between 1 and 20 and ${columna} ~ ${sql.raw(`'${FORMA_DE_LOS_NUMEROS}'`)})`;

/** El registro: inscrito lleva los cinco datos del libro; posesorio, el documento y no la titulación inscrita. */
function restriccionesDelRegistro(t: Columnas) {
  return [
    check('inmuebles_situacion_valida', sql`${t.situacionRegistral} in ('inscrito', 'posesorio')`),
    check('inmuebles_registro_valido', sql`${t.registro} is null or ${t.registro} in ('general', 'segundo')`),
    check(
      'inmuebles_registro_completo',
      sql`(${t.situacionRegistral} = 'inscrito') = (${t.registro} is not null and ${t.numeroDeFinca} is not null and ${t.folio} is not null and ${t.libro} is not null and ${t.departamentoRegistral} is not null)`,
    ),
    check('inmuebles_finca_valida', datoDelRegistro(t.numeroDeFinca)),
    check('inmuebles_folio_valido', datoDelRegistro(t.folio)),
    check('inmuebles_libro_valido', datoDelRegistro(t.libro)),
    check('inmuebles_documento_posesorio_valido', textoOpcionalDe(t.documentoPosesorio, 300)),
    check(
      'inmuebles_documento_solo_posesorio',
      sql`${t.documentoPosesorio} is null or ${t.situacionRegistral} = 'posesorio'`,
    ),
    check(
      'inmuebles_titulacion_solo_posesorio',
      sql`not ${t.titulacionSupletoriaEnTramite} or ${t.situacionRegistral} = 'posesorio'`,
    ),
  ];
}

/** La titularidad, la matrícula fiscal y el catastro. */
function restriccionesDeLaTitularidad(t: Columnas) {
  return [
    check('inmuebles_nombre_valido', sql`char_length(trim(${t.nombre})) between 1 and 120`),
    check('inmuebles_titularidad_valida', sql`${t.titularidad} in ('propia', 'copropiedad', 'de_tercero')`),
    check(
      'inmuebles_porcentaje_valido',
      sql`${t.porcentajeDeCopropiedad} is null or (${t.porcentajeDeCopropiedad} > 0 and ${t.porcentajeDeCopropiedad} < 100)`,
    ),
    check(
      'inmuebles_copropiedad_con_porcentaje',
      sql`(${t.titularidad} = 'copropiedad') = (${t.porcentajeDeCopropiedad} is not null)`,
    ),
    check('inmuebles_titular_valido', textoOpcionalDe(t.titular, 150)),
    check('inmuebles_matricula_valida', textoOpcionalDe(t.matriculaFiscal, 30)),
    check(
      'inmuebles_iusi_valido',
      sql`${t.administraIusi} is null or ${t.administraIusi} in ('dicabi', 'municipalidad')`,
    ),
    check('inmuebles_catastro_valido', textoOpcionalDe(t.codigoCatastral, 40)),
  ];
}

/** La ubicación, la superficie y la cifra de la escritura. */
function restriccionesDeLaSuperficie(t: Columnas) {
  return [
    check('inmuebles_ubicacion_completa', sql`(${t.departamentoCodigo} is null) = (${t.municipioCodigo} is null)`),
    check('inmuebles_direccion_valida', textoOpcionalDe(t.direccion, 300)),
    check('inmuebles_superficie_positiva', sql`${t.superficieRegistralM2} is null or ${t.superficieRegistralM2} > 0`),
    check('inmuebles_cantidad_positiva', sql`${t.cantidadOriginal} is null or ${t.cantidadOriginal} > 0`),
    check(
      'inmuebles_unidad_valida',
      sql`${t.unidadOriginal} is null or ${t.unidadOriginal} in ('m2', 'hectarea', 'manzana', 'cuerda', 'vara_cuadrada', 'caballeria')`,
    ),
    check('inmuebles_cifra_completa', sql`(${t.cantidadOriginal} is null) = (${t.unidadOriginal} is null)`),
    check(
      'inmuebles_varas_validas',
      sql`(${t.unidadOriginal} is not distinct from 'cuerda') = (${t.varasPorLadoDeCuerda} is not null) and (${t.varasPorLadoDeCuerda} is null or ${t.varasPorLadoDeCuerda} between 1 and 100)`,
    ),
    check('inmuebles_observaciones_validas', textoOpcionalDe(t.observaciones, 500)),
  ];
}

/** Las reglas de forma de los datos; el dominio y Zod las repiten para dar mensajes claros. */
export const restriccionesDeInmuebles = (t: Columnas) => [
  ...restriccionesDelRegistro(t),
  ...restriccionesDeLaTitularidad(t),
  ...restriccionesDeLaSuperficie(t),
];

type ColumnasDeLlaves = Record<
  | 'id'
  | 'empresaId'
  | 'nombre'
  | 'situacionRegistral'
  | 'registro'
  | 'numeroDeFinca'
  | 'folio'
  | 'libro'
  | 'departamentoRegistral'
  | 'matriculaFiscal'
  | 'departamentoCodigo'
  | 'municipioCodigo'
  | 'localidadId',
  AnyPgColumn
>;

/** Las llaves compuestas (que no cruzan de empresa) y el destino de las llaves que apunten a un inmueble. */
const llavesDeInmuebles = (t: ColumnasDeLlaves) => [
  foreignKey({
    name: 'inmuebles_localidad_fk',
    columns: [t.localidadId, t.empresaId],
    foreignColumns: [localidades.id, localidades.empresaId],
  }),
  foreignKey({
    name: 'inmuebles_municipio_fk',
    columns: [t.departamentoCodigo, t.municipioCodigo],
    foreignColumns: [municipios.departamentoCodigo, municipios.codigo],
  }),
  // Destino de las llaves compuestas de lo que apunte a un inmueble (valores, parcelas, activos).
  unique('inmuebles_id_empresa_unico').on(t.id, t.empresaId),
];

/** El nombre y la finca inscrita no se repiten en la empresa; la matrícula y la localidad se buscan por índice. */
const indicesDeInmuebles = (t: ColumnasDeLlaves) => [
  uniqueIndex('inmuebles_nombre_unico').on(t.empresaId, nombreNormalizado(t.nombre)),
  uniqueIndex('inmuebles_registro_unico')
    .on(
      t.empresaId,
      t.registro,
      t.departamentoRegistral,
      sql`upper(${t.numeroDeFinca})`,
      sql`upper(${t.folio})`,
      sql`upper(${t.libro})`,
    )
    .where(sql`${t.situacionRegistral} = 'inscrito'`),
  // Búsqueda, sin único: una matrícula puede cubrir varias fincas.
  index('inmuebles_matricula_idx')
    .on(t.empresaId, t.matriculaFiscal)
    .where(sql`${t.matriculaFiscal} is not null`),
  index('inmuebles_localidad_idx')
    .on(t.localidadId)
    .where(sql`${t.localidadId} is not null`),
];

export const llavesEIndicesDeInmuebles = (t: ColumnasDeLlaves) => [...llavesDeInmuebles(t), ...indicesDeInmuebles(t)];
