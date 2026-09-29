import { and, eq, getTableColumns, gte, isNull, lte, or, sql, type AnyColumn } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { MovimientoParaConciliar } from '../../aplicacion/calculo-de-conciliacion.js';
import type { MovimientoConMarcaDto } from '../../aplicacion/dto/conciliacion.dto.js';
import { aCentavos } from '../../dominio/centavos.js';
import { finDelMesDe, inicioDelMesDe, periodoAnterior, type Periodo } from '../../dominio/conciliacion.js';
import { cheques } from './cheques.tablas.js';
import { conciliaciones } from './conciliaciones.tablas.js';
import { movimientos } from './movimientos.tablas.js';
import { saldoVigente } from './saldo-vigente.js';

const chequeDelMovimiento = alias(cheques, 'cheque_de_conciliacion');

const columnasDeMovimiento = {
  ...getTableColumns(movimientos),
  chequeId: chequeDelMovimiento.id,
  numeroDeCheque: chequeDelMovimiento.numero,
};

type FilaDeMovimiento = typeof movimientos.$inferSelect & { chequeId: string | null; numeroDeCheque: number | null };

/**
 * Marcado en una conciliación de un mes posterior: para este mes seguía pendiente.
 * Así el documento de un mes ya autorizado no cambia cuando después se cobra un
 * cheque que estaba en circulación.
 */
const marcadoDespuesDe = (finDelMes: string) =>
  sql`exists (
    select 1 from ${conciliaciones}
    where ${conciliaciones.id} = ${movimientos.conciliacionId}
      and make_date(${conciliaciones.anio}, ${conciliaciones.mes}, 1) > ${finDelMes}::date
  )`;

/**
 * Vigentes, de la cuenta, con fecha hasta el fin de mes, que no se marcaron en
 * una conciliación anterior: los marcados en esta, los pendientes y los que se
 * marcaron en un mes posterior.
 */
const candidatosDe = (cuentaBancariaId: string, finDelMes: string, conciliacionId: string) =>
  and(
    eq(movimientos.cuentaBancariaId, cuentaBancariaId),
    isNull(movimientos.anuladoEn),
    lte(movimientos.fecha, finDelMes),
    or(isNull(movimientos.conciliacionId), eq(movimientos.conciliacionId, conciliacionId), marcadoDespuesDe(finDelMes)),
  );

function aMovimientoConMarca(fila: FilaDeMovimiento, conciliacionId: string): MovimientoConMarcaDto {
  const {
    empresaId: _empresaId,
    creadoEn: _creadoEn,
    actualizadoEn: _actualizadoEn,
    creadoPor: _creadoPor,
    actualizadoPor: _actualizadoPor,
    anuladoEn,
    revertidoEn,
    conciliacionId: marcadaEn,
    ...dto
  } = fila;
  return {
    ...dto,
    anuladoEn: anuladoEn ? anuladoEn.toISOString() : null,
    revertidoEn: revertidoEn ? revertidoEn.toISOString() : null,
    conciliacionId: marcadaEn,
    cuentaBancariaNombre: null,
    marcado: marcadaEn === conciliacionId,
  };
}

/** Igual que `aMovimientoConMarca`, pero solo lo que necesita el cálculo puro. */
export function aMovimientoParaConciliar(m: MovimientoConMarcaDto): MovimientoParaConciliar {
  const { id, tipo, fecha, monto, numeroDeCheque, beneficiario, referencia, marcado } = m;
  return { id, tipo, fecha, monto, numeroDeCheque, beneficiario, referencia, marcado };
}

export async function idsDeCandidatosDe(
  cuentaBancariaId: string,
  finDelMes: string,
  conciliacionId: string,
): Promise<string[]> {
  const filas = await transaccionEnCurso()
    .select({ id: movimientos.id })
    .from(movimientos)
    .where(candidatosDe(cuentaBancariaId, finDelMes, conciliacionId));
  return filas.map((fila) => fila.id);
}

export async function candidatosConMarcaDe(
  cuentaBancariaId: string,
  finDelMes: string,
  conciliacionId: string,
): Promise<MovimientoConMarcaDto[]> {
  const filas = await transaccionEnCurso()
    .select(columnasDeMovimiento)
    .from(movimientos)
    .leftJoin(chequeDelMovimiento, eq(chequeDelMovimiento.movimientoId, movimientos.id))
    .where(candidatosDe(cuentaBancariaId, finDelMes, conciliacionId))
    .orderBy(movimientos.fecha);
  return filas.map((fila) => aMovimientoConMarca(fila, conciliacionId));
}

/** Los vigentes con fecha dentro de este mes (para el lado de libros); `marcado` no aplica y va en `false`. */
export async function movimientosDelMesDe(
  cuentaBancariaId: string,
  periodo: Periodo,
): Promise<MovimientoParaConciliar[]> {
  const filas = await transaccionEnCurso()
    .select(columnasDeMovimiento)
    .from(movimientos)
    .leftJoin(chequeDelMovimiento, eq(chequeDelMovimiento.movimientoId, movimientos.id))
    .where(
      and(
        eq(movimientos.cuentaBancariaId, cuentaBancariaId),
        isNull(movimientos.anuladoEn),
        gte(movimientos.fecha, inicioDelMesDe(periodo)),
        lte(movimientos.fecha, finDelMesDe(periodo)),
      ),
    );
  return filas.map((fila) => aMovimientoParaConciliar(aMovimientoConMarca(fila, '')));
}

async function saldoDeLibrosAlFinDe(cuentaBancariaId: string, fecha: string): Promise<number> {
  const [fila] = await transaccionEnCurso()
    .select({ saldo: sql<string>`(${saldoVigente})::text` })
    .from(movimientos)
    .where(
      and(
        eq(movimientos.cuentaBancariaId, cuentaBancariaId),
        isNull(movimientos.anuladoEn),
        lte(movimientos.fecha, fecha),
      ),
    );
  return aCentavos(fila?.saldo ?? '0.00');
}

/** El saldo calculado del estado de cuenta de la conciliación de ese periodo exacto; `null` si no existe. */
async function fotoDelPeriodoAnterior(cuentaBancariaId: string, periodo: Periodo): Promise<string | null> {
  const anterior = periodoAnterior(periodo);
  const [fila] = await transaccionEnCurso()
    .select({ foto: conciliaciones.fotoSaldoCalculadoEstadoDeCuenta })
    .from(conciliaciones)
    .where(
      and(
        eq(conciliaciones.cuentaBancariaId, cuentaBancariaId),
        eq(conciliaciones.anio, anterior.anio),
        eq(conciliaciones.mes, anterior.mes),
      ),
    );
  return fila?.foto ?? null;
}

/**
 * Saldo inicial de libros = saldo vigente al fin del mes anterior. Saldo
 * inicial de banco = saldo calculado del estado de cuenta de la conciliación
 * autorizada del mes anterior; si no hay ninguna (es la primera), se toma
 * cero: el banco todavía no ha "visto" nada, y el saldo inicial de la cuenta es un documento
 * más que se marca (o queda como crédito en tránsito); sumarlo aquí lo contaría dos veces.
 */
export async function saldosInicialesDe(cuentaBancariaId: string, periodo: Periodo) {
  const librosEnCentavos = await saldoDeLibrosAlFinDe(cuentaBancariaId, finDelMesDe(periodoAnterior(periodo)));
  const foto = await fotoDelPeriodoAnterior(cuentaBancariaId, periodo);
  const bancoEnCentavos = foto ? aCentavos(foto) : 0;
  return { librosEnCentavos, bancoEnCentavos };
}

/** Si la cuenta ya tiene alguna conciliación, de cualquier estado. */
export async function tieneAlgunaConciliacionDe(cuentaBancariaId: string): Promise<boolean> {
  const [fila] = await transaccionEnCurso()
    .select({ id: conciliaciones.id })
    .from(conciliaciones)
    .where(eq(conciliaciones.cuentaBancariaId, cuentaBancariaId))
    .limit(1);
  return fila !== undefined;
}

/** Que no haya pasado por el banco: sin marca, o marcado en la conciliación que se está haciendo. */
const sinPasarPorElBanco = (marca: AnyColumn, conciliacionId: string) => or(isNull(marca), eq(marca, conciliacionId));

/**
 * Ids de los pares original + inverso que nunca pasaron por el banco (ninguno de los dos marcado en
 * otra conciliación) y tienen fecha hasta `finDelMes`: se marcan juntos, compensados, y así no
 * aparecen como partidas en tránsito.
 */
export async function paresCompensadosPendientesDe(
  cuentaBancariaId: string,
  finDelMes: string,
  conciliacionId: string,
): Promise<string[]> {
  const original = alias(movimientos, 'original_compensado');
  const inverso = alias(movimientos, 'inverso_compensado');
  const filas = await transaccionEnCurso()
    .select({ idOriginal: original.id, idInverso: inverso.id })
    .from(inverso)
    .innerJoin(original, eq(inverso.revierteAId, original.id))
    .where(
      and(
        eq(inverso.cuentaBancariaId, cuentaBancariaId),
        sinPasarPorElBanco(inverso.conciliacionId, conciliacionId),
        sinPasarPorElBanco(original.conciliacionId, conciliacionId),
        lte(inverso.fecha, finDelMes),
        lte(original.fecha, finDelMes),
      ),
    );
  return filas.flatMap((fila) => [fila.idOriginal, fila.idInverso]);
}
