import { and, isNull, lte, ne, or, sql, type AnyColumn } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { conciliaciones } from './conciliaciones.tablas.js';
import { movimientos } from './movimientos.tablas.js';

const inversoDelPar = alias(movimientos, 'inverso_del_par');
const originalDelPar = alias(movimientos, 'original_del_par');

/**
 * Si la marca es de una conciliación autorizada de un mes que empieza hasta la fecha de corte: el banco ya lo vio.
 * Una marca de una conciliación todavía en proceso no cuenta: el mes no está cerrado.
 */
const yaLoVioElBanco = (conciliacionId: AnyColumn, corte: string) =>
  sql`(${conciliacionId} is not null and exists (
    select 1 from ${conciliaciones}
    where ${conciliaciones.id} = ${conciliacionId}
      and ${conciliaciones.estado} = 'autorizada'
      and make_date(${conciliaciones.anio}, ${conciliaciones.mes}, 1) <= ${corte}::date
  ))`;

/** Lo que debe cumplir un movimiento (o su alias) para ser parte de un par compensado: vigente, hasta el corte y sin ver. */
interface ColumnasDeUnPar {
  anuladoEn: AnyColumn;
  fecha: AnyColumn;
  conciliacionId: AnyColumn;
}

const estaEnTransito = (m: ColumnasDeUnPar, corte: string) =>
  and(isNull(m.anuladoEn), lte(m.fecha, corte), sql`not ${yaLoVioElBanco(m.conciliacionId, corte)}`);

/**
 * Los ids de los pares original + inverso que el banco no vio y que están hasta el corte: se compensan (nunca pasaron por
 * el banco), igual que al conciliar. Si alguno de los dos ya se marcó, o el inverso es posterior al corte, el otro sigue en
 * tránsito. Es un conjunto aparte (no una subconsulta por fila): parte de los pocos inversos que hay, por su índice.
 */
const idsDeParesCompensados = (corte: string) => sql`(
  select unnest(array[${inversoDelPar.id}, ${originalDelPar.id}])
  from ${movimientos} ${sql.identifier('inverso_del_par')}
  inner join ${movimientos} ${sql.identifier('original_del_par')} on ${originalDelPar.id} = ${inversoDelPar.revierteAId}
  where ${inversoDelPar.cuentaBancariaId} = ${originalDelPar.cuentaBancariaId}
    and ${estaEnTransito(inversoDelPar, corte)} and ${estaEnTransito(originalDelPar, corte)}
)`;

/**
 * Las partidas que el banco aún no ha visto a la fecha: vigentes, con fecha hasta el corte, sin marca de una
 * conciliación autorizada de un mes hasta el corte, sin el saldo del banco de la apertura (es lo que el banco ya vio)
 * y sin los pares compensados.
 */
export const enTransitoA = (corte: string) =>
  and(
    isNull(movimientos.anuladoEn),
    lte(movimientos.fecha, corte),
    or(isNull(movimientos.parteDeApertura), ne(movimientos.parteDeApertura, 'saldo_del_banco')),
    sql`not ${yaLoVioElBanco(movimientos.conciliacionId, corte)}`,
    sql`${movimientos.id} not in ${idsDeParesCompensados(corte)}`,
  );

/** Qué es la partida en tránsito: error del banco, cheque en circulación, depósito o débito. */
export const categoriaEnTransito = sql<string>`case
  when ${movimientos.parteDeApertura} = 'error_del_banco' then 'error_del_banco'
  when ${movimientos.tipo} = 'cheque' then 'cheque_en_circulacion'
  when ${movimientos.tipo} = 'credito' then 'deposito_en_transito'
  else 'debito_en_transito' end`;

/** Lo que el movimiento hace al saldo en libros: el crédito suma; el débito y el cheque restan. */
export const efectoEnLibros = sql`case when ${movimientos.tipo} = 'credito' then ${movimientos.monto} else -${movimientos.monto} end`;
