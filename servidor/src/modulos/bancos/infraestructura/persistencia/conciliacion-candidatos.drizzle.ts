import { and, eq, getTableColumns, gte, isNull, lte, or, sql } from 'drizzle-orm';
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
    conciliacionId: marcadaEn,
    ...dto
  } = fila;
  return {
    ...dto,
    anuladoEn: anuladoEn ? anuladoEn.toISOString() : null,
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
 * igual al de libros: no hay partidas pendientes previas que el sistema conozca.
 */
export async function saldosInicialesDe(cuentaBancariaId: string, periodo: Periodo) {
  const librosEnCentavos = await saldoDeLibrosAlFinDe(cuentaBancariaId, finDelMesDe(periodoAnterior(periodo)));
  const foto = await fotoDelPeriodoAnterior(cuentaBancariaId, periodo);
  const bancoEnCentavos = foto ? aCentavos(foto) : librosEnCentavos;
  return { librosEnCentavos, bancoEnCentavos };
}
