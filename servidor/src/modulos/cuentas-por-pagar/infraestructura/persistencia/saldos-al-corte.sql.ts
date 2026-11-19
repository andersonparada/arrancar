import { sql, type SQL } from 'drizzle-orm';
import { expresionDeEstadoDePago } from './expresion-de-estado-de-pago.js';
import type { BaseDelCorte, FiltroDeAutorizacion } from '../../aplicacion/puertos/puertos-de-saldos-al-corte.js';

/**
 * Las piezas de SQL del saldo a una fecha de corte (`docs/modulos/diseno-cp5-reportes.md` §2 y §9). Cada pieza es una
 * expresión de tabla común (CTE); `saldosAlCorte` las junta. Las mismas reglas están en `dominio/saldo-al-corte.ts`.
 * Todo se filtra por `empresa_id` a propósito: RLS ya limita a la empresa, pero así los índices que empiezan por la
 * empresa sirven y no se recorren las filas de las demás.
 */

/** De qué empresa, a qué corte y con qué fecha de inicio se calcula. */
export interface ParametrosDeCorte {
  empresaId: string;
  /** `AAAA-MM-DD`. */
  corte: string;
  /** La fecha de inicio de la empresa; `null` si todavía no tiene. */
  fechaDeInicio: string | null;
  proveedorId?: string;
}

const HORA_DE_GUATEMALA = "'America/Guatemala'";

/** El día de Guatemala de una marca de tiempo. */
const diaEnGuatemala = (columna: string): SQL => sql.raw(`(${columna} at time zone ${HORA_DE_GUATEMALA})::date`);

/** Desde qué día cuenta un documento (§2.2): su emisión, o la fecha de inicio si es del libro y se emitió antes. */
export const fechaDeEfectoDelDocumentoSql = (fechaDeInicio: string | null): SQL =>
  sql`case when d.origen = 'libro_de_compras' then greatest(d.fecha_emision, coalesce(${fechaDeInicio}::date, d.fecha_emision)) else d.fecha_emision end`;

/** Los documentos con efecto hasta el corte y no anulados al corte, con lo que cada reporte necesita de ellos. */
function documentosAlCorte({ empresaId, corte, fechaDeInicio, proveedorId }: ParametrosDeCorte): SQL {
  const delProveedor = proveedorId ? sql`and d.proveedor_id = ${proveedorId}::uuid` : sql``;
  return sql`docs as (
    select d.id, d.proveedor_id, d.tipo, d.origen, d.serie, d.numero, d.fecha_emision, d.vencimiento, d.total,
           d.retenciones, d.saldo_al_inicio, d.retenciones_por_practicar, d.estado, d.creado_en,
           ${fechaDeEfectoDelDocumentoSql(fechaDeInicio)} as fecha_de_efecto,
           coalesce(d.saldo_al_inicio, d.total - d.retenciones) as neto,
           coalesce(d.saldo_al_inicio, d.total) as base,
           d.tipo = 'nota_de_credito' as es_nota,
           (d.estado = 'autorizado' or (d.estado = 'anulado' and d.estaba_autorizado)) as autorizado
      from cuentas_por_pagar.documentos d
     where d.empresa_id = ${empresaId}::uuid ${delProveedor}
       and d.fecha_emision <= ${corte}::date
       and ${fechaDeEfectoDelDocumentoSql(fechaDeInicio)} <= ${corte}::date
       and (d.estado <> 'anulado' or ${diaEnGuatemala('d.anulado_en')} > ${corte}::date))`;
}

/** Lo que las notas aplicaron hasta el corte, por cargo y por nota (la fecha de la aplicación es desde cuándo rebaja). */
function aplicacionesDeNotas({ empresaId, corte }: ParametrosDeCorte): SQL {
  const aplicado = (columna: 'cargo_id' | 'nota_id', nombre: string) =>
    sql`${sql.raw(nombre)} as (
    select ${sql.raw(columna)} as id, sum(monto) as monto
      from cuentas_por_pagar.aplicaciones_de_notas
     where empresa_id = ${empresaId}::uuid and fecha <= ${corte}::date group by ${sql.raw(columna)})`;
  return sql`${aplicado('cargo_id', 'al_cargo')}, ${aplicado('nota_id', 'por_la_nota')}`;
}

/** Los ajustes vigentes al corte (una anulación posterior al corte no los quita todavía). */
function ajustesVigentes({ empresaId, corte }: ParametrosDeCorte): SQL {
  return sql`ajustado as (
    select documento_id as id, sum(monto) as monto
      from cuentas_por_pagar.ajustes_de_saldo
     where empresa_id = ${empresaId}::uuid and fecha <= ${corte}::date
       and (estado = 'vigente' or ${diaEnGuatemala('anulado_en')} > ${corte}::date)
     group by documento_id)`;
}

/** El último día del mes de la conciliación autorizada que marcó el cheque; nulo si no hay. */
export const FIN_DE_MES_COBRADO = sql.raw(
  "(make_date(cn.anio, cn.mes, 1) + interval '1 month' - interval '1 day')::date",
);

/**
 * El pago cuenta al corte (alias `p`): vigente, o anulado después del corte (§2.3). Un cheque posfechado anulado queda
 * con la fecha contable del cheque (futura, nunca anterior a ella): mientras esa fecha sea posterior al corte, lo
 * comprometido se cuenta hasta el día en que de verdad se anuló.
 */
export const pagoCuentaAlCorte = (corte: string): SQL =>
  sql`(p.estado = 'vigente' or (p.fecha_de_anulacion > ${corte}::date
       and (p.fecha <= ${corte}::date or ${diaEnGuatemala('p.anulado_en')} > ${corte}::date)))`;

/**
 * Los pagos al corte, por cargo: lo que ya rebaja (fecha de efecto hasta el corte, §2.1) y lo comprometido (entregado
 * hasta el corte pero con efecto posterior). Un pago anulado después del corte sigue contando.
 */
function pagosAlCorte({ empresaId, corte }: ParametrosDeCorte): SQL {
  return sql`pagado as (
    select a.cargo_id as id,
           sum(a.monto) filter (where e.efecto <= ${corte}::date) as pagado,
           sum(a.monto) filter (where e.efecto > ${corte}::date) as comprometido
      from cuentas_por_pagar.aplicaciones_de_pagos a
      join cuentas_por_pagar.pagos p on p.id = a.pago_id and p.empresa_id = ${empresaId}::uuid
      left join bancos.movimientos m on m.id = p.movimiento_id
      left join bancos.conciliaciones cn on cn.id = m.conciliacion_id and cn.estado = 'autorizada'
     cross join lateral (select least(p.fecha, coalesce(${FIN_DE_MES_COBRADO}, p.fecha)) as efecto) e
     where a.empresa_id = ${empresaId}::uuid
       and ${pagoCuentaAlCorte(corte)}
       and (p.fecha <= ${corte}::date or ${diaEnGuatemala('p.creado_en')} <= ${corte}::date)
     group by a.cargo_id)`;
}

/** Lo que los reintegros vigentes al corte devolvieron contra cada nota. */
function reintegrosAlCorte({ empresaId, corte }: ParametrosDeCorte): SQL {
  return sql`reintegrado as (
    select ar.nota_id as id, sum(ar.monto) as monto
      from cuentas_por_pagar.aplicaciones_de_reintegros ar
      join cuentas_por_pagar.reintegros r on r.id = ar.reintegro_id and r.empresa_id = ${empresaId}::uuid
     where ar.empresa_id = ${empresaId}::uuid and r.fecha <= ${corte}::date
       and (r.estado = 'vigente' or r.fecha_de_anulacion > ${corte}::date)
     group by ar.nota_id)`;
}

/** Cada documento con su saldo al corte (cargo: neto menos rebajas; nota: base menos rebajas) y sus rebajas. */
function saldosPorDocumento({ corte }: ParametrosDeCorte): SQL {
  return sql`saldos_base as (
    select d.*,
           ${corte}::date - d.vencimiento as dias_vencido,
           coalesce(case when d.es_nota then pn.monto else ac.monto end, 0) as aplicado,
           coalesce(pg.pagado, 0) as pagado, coalesce(pg.comprometido, 0) as comprometido,
           coalesce(aj.monto, 0) as ajustado, coalesce(re.monto, 0) as reintegrado,
           case when d.es_nota then d.base - coalesce(pn.monto, 0) - coalesce(aj.monto, 0) - coalesce(re.monto, 0)
                else d.neto - coalesce(ac.monto, 0) - coalesce(pg.pagado, 0) - coalesce(aj.monto, 0) end as saldo
      from docs d
      left join al_cargo ac on ac.id = d.id
      left join por_la_nota pn on pn.id = d.id
      left join ajustado aj on aj.id = d.id
      left join pagado pg on pg.id = d.id
      left join reintegrado re on re.id = d.id),
  saldos as (select *, ${expresionDeEstadoDePago({ deuda: sql.raw('saldo'), pagado: sql.raw('pagado'), comprometido: sql.raw('comprometido') })} as estado_de_pago from saldos_base)`;
}

/**
 * Todas las expresiones de tabla del saldo al corte, separadas por coma y sin `with`: quien las usa agrega `with` al
 * principio y su `select` al final. Terminan en `saldos` (un documento por fila).
 */
export function saldosAlCorte(parametros: ParametrosDeCorte): SQL {
  const piezas = [
    documentosAlCorte(parametros),
    aplicacionesDeNotas(parametros),
    ajustesVigentes(parametros),
    pagosAlCorte(parametros),
    reintegrosAlCorte(parametros),
    saldosPorDocumento(parametros),
  ];
  return sql.join(piezas, sql`, `);
}

/** El `where` de la autorización de hoy sobre los documentos (la CTE `saldos`, alias `s`). */
export function condicionDeAutorizacion(autorizacion: FiltroDeAutorizacion): SQL {
  if (autorizacion === 'autorizados') return sql`s.autorizado`;
  return autorizacion === 'sin_autorizar' ? sql`not s.autorizado` : sql`true`;
}

/** Lo que identifica el corte en las piezas de SQL. */
export const parametrosDe = ({ empresaId, corte, fechaDeInicio, proveedorId }: BaseDelCorte): ParametrosDeCorte => ({
  empresaId,
  corte,
  fechaDeInicio,
  proveedorId,
});
