import { and, asc, eq, isNull, lte, sql } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { PuntoDePartida, SaldoDelBancoDeLaApertura } from '../../aplicacion/puertos/consultas-conciliaciones.js';
import { aCentavos, deCentavos, efectoEnCentavos } from '../../dominio/centavos.js';
import { finDelMesDe, periodoAnterior, type Periodo } from '../../dominio/conciliacion.js';
import { conciliaciones } from './conciliaciones.tablas.js';
import { movimientos } from './movimientos.tablas.js';
import { saldoVigente } from './saldo-vigente.js';
import { saldosIniciales } from './saldos-iniciales.tablas.js';

const vigentesDe = (cuentaBancariaId: string) =>
  and(eq(movimientos.cuentaBancariaId, cuentaBancariaId), isNull(movimientos.anuladoEn));

/** El día anterior a una fecha `AAAA-MM-DD`. */
function diaAnterior(fecha: string): string {
  const dia = new Date(`${fecha}T00:00:00Z`);
  dia.setUTCDate(dia.getUTCDate() - 1);
  return dia.toISOString().slice(0, 10);
}

async function saldoDeLibrosAlFinDe(cuentaBancariaId: string, fecha: string): Promise<number> {
  const [fila] = await transaccionEnCurso()
    .select({ saldo: sql<string>`(${saldoVigente})::text` })
    .from(movimientos)
    .where(and(vigentesDe(cuentaBancariaId), lte(movimientos.fecha, fecha)));
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

/** El saldo del estado de cuenta al corte (con su signo) de la carga inicial de la cuenta; `null` si no tiene. */
export async function saldoDelBancoDeLaAperturaDe(cuentaBancariaId: string): Promise<SaldoDelBancoDeLaApertura | null> {
  const [fila] = await transaccionEnCurso()
    .select({ fecha: movimientos.fecha, tipo: movimientos.tipo, monto: movimientos.monto })
    .from(movimientos)
    .where(and(vigentesDe(cuentaBancariaId), eq(movimientos.parteDeApertura, 'saldo_del_banco')))
    .limit(1);
  if (!fila) return null;
  return { fecha: fila.fecha, monto: deCentavos(efectoEnCentavos(fila.tipo, fila.monto)) };
}

/**
 * Si la cuenta se cargó con el saldo del estado de cuenta: tiene su movimiento, o tiene cabecera sin movimiento (un
 * saldo en cero no se guarda) y sin el saldo global de antes.
 */
export async function conSaldoDelBancoDe(cuentaBancariaId: string): Promise<boolean> {
  if (await saldoDelBancoDeLaAperturaDe(cuentaBancariaId)) return true;
  const [cabecera] = await transaccionEnCurso()
    .select({ id: saldosIniciales.id })
    .from(saldosIniciales)
    .where(eq(saldosIniciales.cuentaBancariaId, cuentaBancariaId));
  if (!cabecera) return false;
  const [global] = await transaccionEnCurso()
    .select({ id: movimientos.id })
    .from(movimientos)
    .where(and(vigentesDe(cuentaBancariaId), eq(movimientos.parteDeApertura, 'saldo_global')))
    .limit(1);
  return !global;
}

/**
 * El saldo del banco de la carga inicial, también cuando es cero y no se guardó como movimiento (solo hay cabecera):
 * entonces su fecha es el corte de la carga (el día anterior a la fecha de inicio) y su monto, cero.
 */
async function saldoDelBancoOEnCeroDe(
  cuentaBancariaId: string,
  fechaDeInicio: string | null,
): Promise<SaldoDelBancoDeLaApertura | null> {
  const guardado = await saldoDelBancoDeLaAperturaDe(cuentaBancariaId);
  if (guardado || !(await conSaldoDelBancoDe(cuentaBancariaId))) return guardado;
  return fechaDeInicio ? { fecha: diaAnterior(fechaDeInicio), monto: '0.00' } : null;
}

/** La fecha del primer movimiento vigente de la cuenta; `null` si no tiene ninguno. */
export async function fechaDelPrimerMovimientoDe(cuentaBancariaId: string): Promise<string | null> {
  const [fila] = await transaccionEnCurso()
    .select({ fecha: movimientos.fecha })
    .from(movimientos)
    .where(vigentesDe(cuentaBancariaId))
    .orderBy(asc(movimientos.fecha))
    .limit(1);
  return fila?.fecha ?? null;
}

/**
 * De dónde parte la conciliación de un periodo. Con la del mes anterior hecha: sus saldos (el del banco es el
 * calculado de su foto). Sin ella: cero para el banco y el saldo de libros al fin del mes anterior, salvo la primera
 * de una cuenta con saldo del banco: el banco parte de ese saldo y los libros, del saldo al corte. Si el corte cae a
 * mitad del mes, el mes se toma desde el día siguiente al corte; si cae antes, desde el principio del mes.
 */
export async function puntoDePartidaDe(
  cuentaBancariaId: string,
  periodo: Periodo,
  fechaDeInicio: string | null,
): Promise<PuntoDePartida> {
  const finDelMesAnterior = finDelMesDe(periodoAnterior(periodo));
  const foto = await fotoDelPeriodoAnterior(cuentaBancariaId, periodo);
  const delBanco = foto ? null : await saldoDelBancoOEnCeroDe(cuentaBancariaId, fechaDeInicio);
  const despuesDe = delBanco && delBanco.fecha > finDelMesAnterior ? delBanco.fecha : finDelMesAnterior;
  return {
    librosEnCentavos: await saldoDeLibrosAlFinDe(cuentaBancariaId, despuesDe),
    bancoEnCentavos: aCentavos(foto ?? delBanco?.monto ?? '0.00'),
    despuesDe,
    saldoInicialDelBancoDeLaApertura: delBanco,
  };
}
