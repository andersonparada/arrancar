import { and, asc, eq, gte, inArray, isNull, lte, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { exigirQueExista } from '../../../core/compartido/infraestructura/exigir-que-exista.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { CLAVE_DE_ANULACION_DE_APERTURA } from '../../dominio/anulacion-de-apertura.js';
import type {
  FiltroDeTotalesPorConcepto,
  SaldosDelRango,
  TotalesDeUnConcepto,
} from '../../aplicacion/dto/reportes-por-concepto.dto.js';
import type { ConsultasDeTotalesPorConcepto } from '../../aplicacion/puertos/consultas-de-totales-por-concepto.js';
import { conceptos } from './conceptos.tablas.js';
import { cuentasBancarias } from './cuentas-bancarias.tablas.js';
import { desgloseDeMovimientos } from './desglose-de-movimientos.tablas.js';
import { movimientos } from './movimientos.tablas.js';

const original = alias(movimientos, 'original');

/** La línea del reparto si el movimiento (o su original) tiene desglose; si no, el monto entero. */
const montoDeLaLinea = sql`coalesce(${desgloseDeMovimientos.monto}, ${movimientos.monto})`;

/** Lo que suma la línea de los movimientos que cumplen la condición (cero si ninguno). */
const sumaDe = (condicion: SQL) => sql`coalesce(sum(${montoDeLaLinea}) filter (where ${condicion}), 0)`;
const cuentaDe = (condicion: SQL) => sql<number>`(count(distinct ${movimientos.id}) filter (where ${condicion}))::int`;

/**
 * El inverso de una partida de la carga inicial que se anuló lleva su propio concepto («Partidas de apertura anuladas»,
 * sin actividad): no mueve efectivo y no debe contarse como el saldo inicial de su original.
 */
const esAnulacionDeApertura = sql`exists (
  select 1 from ${conceptos} propio
  where propio.id = ${movimientos.conceptoId} and propio.clave_de_sistema = ${CLAVE_DE_ANULACION_DE_APERTURA}
)`;

/** Para el reporte, el inverso de una partida de la carga cuenta como un movimiento propio (no resta a su original). */
const esOriginal = sql`(${movimientos.revierteAId} is null or ${esAnulacionDeApertura})`;
const esInverso = sql`(${movimientos.revierteAId} is not null and not ${esAnulacionDeApertura})`;
const esCredito = sql`${movimientos.tipo} = 'credito'`;
const noEsCredito = sql`${movimientos.tipo} <> 'credito'`;

/** Créditos originales menos débitos inversos (un inverso resta en el sentido de su original). */
const entradas = sql<string>`(${sumaDe(sql`${esOriginal} and ${esCredito}`)} - ${sumaDe(sql`${esInverso} and ${noEsCredito}`)})::numeric(14,2)::text`;
/** Débitos y cheques originales menos créditos inversos. */
const salidas = sql<string>`(${sumaDe(sql`${esOriginal} and ${noEsCredito}`)} - ${sumaDe(sql`${esInverso} and ${esCredito}`)})::numeric(14,2)::text`;

/** Lo que mueve el saldo: crédito suma, débito y cheque restan. */
const efecto = sql`case when ${esCredito} then ${movimientos.monto} else -${movimientos.monto} end`;
const saldoHasta = (condicion: SQL) =>
  sql<string>`(coalesce(sum(${efecto}) filter (where ${condicion}), 0))::numeric(14,2)::text`;

/** El reparto de un inverso es el de su original (salvo la anulación de una partida de apertura). */
const idDelReparto = sql`case when ${esAnulacionDeApertura} then ${movimientos.id} else coalesce(${original.id}, ${movimientos.id}) end`;
const conceptoDeLaLinea = sql`coalesce(${desgloseDeMovimientos.conceptoId}, case when ${esAnulacionDeApertura} then null else ${original.conceptoId} end, ${movimientos.conceptoId})`;

const columnasDeTotales = {
  conceptoId: conceptos.id,
  conceptoNombre: conceptos.nombre,
  claveDeSistema: conceptos.claveDeSistema,
  actividadDeFlujo: conceptos.actividadDeFlujo,
  grupoDeFlujo: conceptos.grupoDeFlujo,
  entradas,
  salidas,
  cantidad: cuentaDe(esOriginal),
  cantidadDeInversos: cuentaDe(esInverso),
};

/** Solo lo vigente (los anulados a la antigua no cuentan, como en el saldo), en el rango y la cuenta elegidos. */
const condicionesDeLosMovimientos = ({ desde, hasta, cuentaBancariaId }: FiltroDeTotalesPorConcepto) => [
  isNull(movimientos.anuladoEn),
  gte(movimientos.fecha, desde),
  lte(movimientos.fecha, hasta),
  cuentaBancariaId ? eq(movimientos.cuentaBancariaId, cuentaBancariaId) : undefined,
];

/**
 * Agregaciones en la base para los reportes por concepto: una consulta por reporte, sin traer movimientos. El
 * concepto de un inverso es el de su original (unión consigo misma por `revierte_a_id`) y, si el movimiento tiene
 * desglose (CP4), cada línea cuenta en su concepto con su monto (un inverso usa el desglose de su original).
 */
export class ConsultasDeTotalesPorConceptoDrizzle implements ConsultasDeTotalesPorConcepto {
  async exigirCuenta(cuentaBancariaId: string): Promise<void> {
    await exigirQueExista(cuentasBancarias, cuentaBancariaId, 'La cuenta bancaria');
  }

  async totalesPorConcepto(filtro: FiltroDeTotalesPorConcepto): Promise<TotalesDeUnConcepto[]> {
    const { conceptoIds } = filtro;
    return transaccionEnCurso()
      .select(columnasDeTotales)
      .from(movimientos)
      .leftJoin(original, eq(original.id, movimientos.revierteAId))
      .leftJoin(desgloseDeMovimientos, eq(desgloseDeMovimientos.movimientoId, idDelReparto))
      .innerJoin(conceptos, eq(conceptos.id, conceptoDeLaLinea))
      .where(
        and(
          ...condicionesDeLosMovimientos(filtro),
          conceptoIds?.length ? inArray(conceptos.id, conceptoIds) : undefined,
        ),
      )
      .groupBy(conceptos.id)
      .orderBy(asc(conceptos.nombre));
  }

  async saldosDelRango({ desde, hasta, cuentaBancariaId }: FiltroDeTotalesPorConcepto): Promise<SaldosDelRango> {
    const [fila] = await transaccionEnCurso()
      .select({
        saldoAlInicio: saldoHasta(sql`${movimientos.fecha} < ${desde}`),
        saldoAlFinal: saldoHasta(sql`${movimientos.fecha} <= ${hasta}`),
      })
      .from(movimientos)
      .where(
        and(
          isNull(movimientos.anuladoEn),
          cuentaBancariaId ? eq(movimientos.cuentaBancariaId, cuentaBancariaId) : undefined,
        ),
      );
    return fila ?? { saldoAlInicio: '0.00', saldoAlFinal: '0.00' };
  }
}
