import { sql, type SQL } from 'drizzle-orm';
import type { RangoDelEstado } from '../../aplicacion/puertos/puertos-de-reportes-de-proveedor.js';
import { fechaDeEfectoDelDocumentoSql } from './saldos-al-corte.sql.js';

/**
 * Las piezas de SQL del estado de cuenta de un proveedor (R3, `docs/modulos/diseno-cp5-reportes.md` §4). Cada hecho sale
 * de su tabla con las mismas reglas de fecha de efecto y de anulación contable que el saldo al corte
 * (`saldos-al-corte.sql.ts`), así que la suma de las líneas cuadra con el saldo de R1.
 */

/** Las columnas comunes de todos los hechos, con su tipo: `union all` pide que coincidan. */
const COLUMNAS = [
  ['hecho', 'text'],
  ['fecha', 'date'],
  ['registrado_en', 'timestamptz'],
  ['es_cargo', 'boolean'],
  ['monto', 'numeric'],
  ['anulado', 'boolean'],
  ['documento_id', 'uuid'],
  ['tipo', 'text'],
  ['serie', 'text'],
  ['numero', 'text'],
  ['registro_numero', 'integer'],
  ['registro_anio', 'integer'],
  ['forma', 'text'],
  ['referencia', 'text'],
  ['total', 'numeric'],
  ['retenciones', 'numeric'],
  ['saldo_al_inicio', 'numeric'],
  ['es_saldo_inicial', 'boolean'],
] as const;

type Columna = (typeof COLUMNAS)[number][0];
type Valores = Partial<Record<Columna, SQL>>;

/** El `select` de un hecho: lo que no dice se lleva como nulo del tipo que toca. */
function proyeccion(valores: Valores): SQL {
  const columnas = COLUMNAS.map(
    ([nombre, tipo]) => sql`(${valores[nombre] ?? sql`null`})::${sql.raw(tipo)} as ${sql.raw(nombre)}`,
  );
  return sql.join(columnas, sql`, `);
}

const diaEnGuatemala = (columna: string): SQL => sql.raw(`(${columna} at time zone 'America/Guatemala')::date`);

/** Los datos del documento (alias `d`) que identifican y explican la línea. */
const DEL_DOCUMENTO: Valores = {
  documento_id: sql.raw('d.id'),
  tipo: sql.raw('d.tipo'),
  serie: sql.raw('d.serie'),
  numero: sql.raw('d.numero'),
  total: sql.raw('d.total'),
  retenciones: sql.raw('d.retenciones'),
  saldo_al_inicio: sql.raw('d.saldo_al_inicio'),
  es_saldo_inicial: sql.raw("d.origen = 'saldo_inicial'"),
};

/** Los datos del pago o del reintegro (alias `p`) que lo identifican. */
const DEL_REGISTRO: Valores = {
  registro_numero: sql.raw('p.numero'),
  registro_anio: sql.raw('p.anio_de_numero'),
  forma: sql.raw('p.forma'),
  referencia: sql.raw('p.referencia'),
};

const condicionDelRango = (columna: string, { desde, hasta }: RangoDelEstado): SQL =>
  sql`${sql.raw(columna)} between ${desde}::date and ${hasta}::date`;

/** Los documentos del proveedor con su fecha de efecto y el día en que se anularon, hasta el fin del rango. */
export function documentosDelProveedor(rango: RangoDelEstado): SQL {
  return sql`docs_p as (
    select d.*, ${fechaDeEfectoDelDocumentoSql(rango.fechaDeInicio)} as efecto,
           case when d.estado = 'anulado' then ${diaEnGuatemala('d.anulado_en')} end as dia_anulacion,
           d.tipo = 'nota_de_credito' as es_nota,
           coalesce(d.saldo_al_inicio, d.total - d.retenciones) as neto,
           coalesce(d.saldo_al_inicio, d.total) as base
      from cuentas_por_pagar.documentos d
     where d.empresa_id = ${rango.empresaId}::uuid and d.proveedor_id = ${rango.proveedorId}::uuid
       and d.fecha_emision <= ${rango.hasta}::date)`;
}

/** Los pagos del proveedor con su fecha de efecto (§2.1: un cheque cobrado antes de su fecha rebaja desde su conciliación). */
export function pagosDelProveedor(rango: RangoDelEstado): SQL {
  const finDelMes = "(make_date(cn.anio, cn.mes, 1) + interval '1 month' - interval '1 day')::date";
  return sql`pagos_p as (
    select p.*, least(p.fecha, coalesce(${sql.raw(finDelMes)}, p.fecha)) as efecto,
           coalesce(m.referencia, p.referencia) as referencia_mostrada
      from cuentas_por_pagar.pagos p
      left join bancos.movimientos m on m.id = p.movimiento_id
      left join bancos.conciliaciones cn on cn.id = m.conciliacion_id and cn.estado = 'autorizada'
     where p.empresa_id = ${rango.empresaId}::uuid and p.proveedor_id = ${rango.proveedorId}::uuid
       and (p.fecha <= ${rango.hasta}::date or ${diaEnGuatemala('p.creado_en')} <= ${rango.hasta}::date))`;
}

/** Los ajustes del proveedor con su documento y el día en que se anularon. */
export function ajustesDelProveedor(rango: RangoDelEstado): SQL {
  return sql`ajustes_p as (
    select a.*, d.id as doc_id, d.tipo as doc_tipo, d.serie as doc_serie, d.numero as doc_numero,
           d.tipo = 'nota_de_credito' as es_nota,
           case when a.estado <> 'vigente' then ${diaEnGuatemala('a.anulado_en')} end as dia_anulacion
      from cuentas_por_pagar.ajustes_de_saldo a
      join cuentas_por_pagar.documentos d on d.id = a.documento_id
     where a.empresa_id = ${rango.empresaId}::uuid and a.proveedor_id = ${rango.proveedorId}::uuid
       and a.fecha <= ${rango.hasta}::date)`;
}

/** Los hechos de los documentos: los del rango (anulados dentro de él, marcados) y la reversa de los anteriores. */
export function hechosDeDocumentos(rango: RangoDelEstado): SQL[] {
  const { desde, hasta } = rango;
  const monto = sql.raw('case when d.es_nota then d.base else d.neto end');
  const hechos = sql`select ${proyeccion({
    ...DEL_DOCUMENTO,
    hecho: sql.raw("case when d.es_nota then 'nota_de_credito' else 'documento' end"),
    fecha: sql.raw('d.efecto'),
    registrado_en: sql.raw('d.creado_en'),
    es_cargo: sql.raw('not d.es_nota'),
    monto,
    anulado: sql`(d.dia_anulacion is not null and d.dia_anulacion <= ${hasta}::date)`,
  })} from docs_p d where ${condicionDelRango('d.efecto', rango)}`;
  const reversa = sql`select ${proyeccion({
    ...DEL_DOCUMENTO,
    hecho: sql`'anulacion_de_documento'`,
    fecha: sql.raw('d.dia_anulacion'),
    registrado_en: sql.raw('d.anulado_en'),
    es_cargo: sql.raw('d.es_nota'),
    monto,
    anulado: sql`false`,
  })} from docs_p d where d.efecto < ${desde}::date and ${condicionDelRango('d.dia_anulacion', rango)}`;
  return [hechos, reversa];
}

/** Los hechos de los pagos: los del rango y la reversa de los anteriores anulados dentro del rango. */
export function hechosDePagos(rango: RangoDelEstado): SQL[] {
  const comunes = { ...DEL_REGISTRO, monto: sql.raw('p.monto'), referencia: sql.raw('p.referencia_mostrada') };
  const hechos = sql`select ${proyeccion({
    ...comunes,
    hecho: sql`'pago'`,
    fecha: sql.raw('p.efecto'),
    registrado_en: sql.raw('p.creado_en'),
    es_cargo: sql`false`,
    anulado: sql`(p.fecha_de_anulacion is not null and p.fecha_de_anulacion <= ${rango.hasta}::date)`,
  })} from pagos_p p where ${condicionDelRango('p.efecto', rango)}`;
  const reversa = sql`select ${proyeccion({
    ...comunes,
    hecho: sql`'anulacion_de_pago'`,
    fecha: sql.raw('p.fecha_de_anulacion'),
    registrado_en: sql.raw('p.anulado_en'),
    es_cargo: sql`true`,
    anulado: sql`false`,
  })} from pagos_p p where p.efecto < ${rango.desde}::date and ${condicionDelRango('p.fecha_de_anulacion', rango)}`;
  return [hechos, reversa];
}

/** Los hechos de los reintegros del proveedor (la devolución aumenta lo que se debe; su anulación lo rebaja). */
export function hechosDeReintegros(rango: RangoDelEstado): SQL[] {
  const delProveedor = sql`from cuentas_por_pagar.reintegros p where p.empresa_id = ${rango.empresaId}::uuid and p.proveedor_id = ${rango.proveedorId}::uuid`;
  const hechos = sql`select ${proyeccion({
    ...DEL_REGISTRO,
    monto: sql.raw('p.monto'),
    hecho: sql`'reintegro'`,
    fecha: sql.raw('p.fecha'),
    registrado_en: sql.raw('p.creado_en'),
    es_cargo: sql`true`,
    anulado: sql`(p.fecha_de_anulacion is not null and p.fecha_de_anulacion <= ${rango.hasta}::date)`,
  })} ${delProveedor} and ${condicionDelRango('p.fecha', rango)}`;
  const reversa = sql`select ${proyeccion({
    ...DEL_REGISTRO,
    monto: sql.raw('p.monto'),
    hecho: sql`'anulacion_de_reintegro'`,
    fecha: sql.raw('p.fecha_de_anulacion'),
    registrado_en: sql.raw('p.anulado_en'),
    es_cargo: sql`false`,
    anulado: sql`false`,
  })} ${delProveedor} and p.fecha < ${rango.desde}::date and ${condicionDelRango('p.fecha_de_anulacion', rango)}`;
  return [hechos, reversa];
}

const DEL_DOCUMENTO_DEL_AJUSTE: Valores = {
  documento_id: sql.raw('a.doc_id'),
  tipo: sql.raw('a.doc_tipo'),
  serie: sql.raw('a.doc_serie'),
  numero: sql.raw('a.doc_numero'),
  monto: sql.raw('a.monto'),
};

/**
 * Los hechos de los ajustes: una baja del saldo a favor de una nota aumenta lo que se debe; una diferencia menor de un
 * cargo lo rebaja. Su anulación hace lo contrario, en el día en que se anuló.
 */
export function hechosDeAjustes(rango: RangoDelEstado): SQL[] {
  const hechos = sql`select ${proyeccion({
    ...DEL_DOCUMENTO_DEL_AJUSTE,
    hecho: sql.raw("case when a.es_nota then 'baja_de_saldo_a_favor' else 'diferencia_menor' end"),
    fecha: sql.raw('a.fecha'),
    registrado_en: sql.raw('a.creado_en'),
    es_cargo: sql.raw('a.es_nota'),
    anulado: sql`(a.dia_anulacion is not null and a.dia_anulacion <= ${rango.hasta}::date)`,
  })} from ajustes_p a where ${condicionDelRango('a.fecha', rango)}`;
  const reversa = sql`select ${proyeccion({
    ...DEL_DOCUMENTO_DEL_AJUSTE,
    hecho: sql`'anulacion_de_ajuste'`,
    fecha: sql.raw('a.dia_anulacion'),
    registrado_en: sql.raw('a.anulado_en'),
    es_cargo: sql.raw('not a.es_nota'),
    anulado: sql`false`,
  })} from ajustes_p a where a.fecha < ${rango.desde}::date and ${condicionDelRango('a.dia_anulacion', rango)}`;
  return [hechos, reversa];
}

/** Todos los hechos del proveedor en el rango, uno por fila (la consulta completa). */
export function movimientosDelProveedorSql(rango: RangoDelEstado): SQL {
  const hechos = [
    ...hechosDeDocumentos(rango),
    ...hechosDePagos(rango),
    ...hechosDeReintegros(rango),
    ...hechosDeAjustes(rango),
  ];
  return sql`with ${sql.join([documentosDelProveedor(rango), pagosDelProveedor(rango), ajustesDelProveedor(rango)], sql`, `)}
    select u.hecho, u.fecha::text as fecha, (u.registrado_en at time zone 'UTC')::text as registrado_en, u.es_cargo,
           u.monto::text as monto, u.anulado, u.documento_id::text as documento_id, u.tipo, u.serie, u.numero,
           u.registro_numero, u.registro_anio, u.forma, u.referencia, u.total::text as total,
           u.retenciones::text as retenciones, u.saldo_al_inicio::text as saldo_al_inicio, u.es_saldo_inicial
      from (${sql.join(hechos, sql` union all `)}) u`;
}
