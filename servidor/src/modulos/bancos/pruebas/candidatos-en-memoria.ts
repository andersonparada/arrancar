import type { MovimientoConMarcaDto } from '../aplicacion/dto/conciliacion.dto.js';
import type { MovimientoParaConciliar } from '../aplicacion/calculo-de-conciliacion.js';
import type { MovimientoDto } from '../aplicacion/dto/movimiento.dto.js';
import type { MovimientosEnMemoria } from './dobles-de-movimientos.js';
import type { Conciliacion, Periodo } from '../dominio/conciliacion.js';
import { aMovimientoParaConciliar } from './ayudas-de-conciliaciones.js';

/**
 * Como en Postgres: los vigentes con fecha hasta el fin de mes y los cheques de fecha posterior, sin el saldo del
 * banco de la carga inicial y sin lo que se marcó en una conciliación de un mes anterior.
 */
export function candidatosEnMemoria(
  todos: readonly MovimientoDto[],
  datos: { marcados: ReadonlySet<string>; marcadosAntes: ReadonlySet<string>; finDelMes: string },
): MovimientoConMarcaDto[] {
  const { marcados, marcadosAntes, finDelMes } = datos;
  return todos
    .filter((m) => !m.anuladoEn && m.parteDeApertura !== 'saldo_del_banco' && !marcadosAntes.has(m.id))
    .filter((m) => m.fecha <= finDelMes || m.tipo === 'cheque')
    .map((m) => ({ ...m, marcado: marcados.has(m.id) }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/** Ids de los pares original + inverso pendientes (ninguno marcado en otra conciliación) con fecha hasta `finDelMes`. */
export function paresCompensadosEnMemoria(
  todos: readonly MovimientoDto[],
  datos: { marcadosAlgunaVez: ReadonlySet<string>; finDelMes: string },
): string[] {
  const pendientes = todos.filter((m) => !datos.marcadosAlgunaVez.has(m.id) && m.fecha <= datos.finDelMes);
  const idsPendientes = new Set(pendientes.map((m) => m.id));
  const resultado = new Set<string>();
  for (const m of pendientes) {
    if (m.revierteAId && idsPendientes.has(m.revierteAId)) {
      resultado.add(m.id);
      resultado.add(m.revierteAId);
    }
  }
  return [...resultado];
}

/** Como en Postgres: los cheques de fecha posterior que el banco ya pagó en un mes anterior, para que sigan restando. */
export async function cobradosEnMesesAnterioresEnMemoria(
  movimientos: MovimientosEnMemoria,
  datos: { cuentaBancariaId: string; marcadosAntes: ReadonlySet<string>; finDelMes: string },
): Promise<MovimientoParaConciliar[]> {
  const { cuentaBancariaId, marcadosAntes, finDelMes } = datos;
  const todos = await movimientos.listar({ cuentaBancariaId });
  return todos
    .filter((m) => !m.anuladoEn && m.tipo === 'cheque' && m.fecha > finDelMes && marcadosAntes.has(m.id))
    .map((m) => ({ ...aMovimientoParaConciliar({ ...m, marcado: false }), cobradoEnMesAnterior: true }));
}

/**
 * Ids marcados en una conciliación de un mes ANTERIOR al de `finDelMes`: no son candidatos aquí. Lo marcado en un mes
 * posterior seguía pendiente en este, como en Postgres.
 */
export function marcadosAntesDeEnMemoria(
  marcas: ReadonlyMap<string, ReadonlySet<string>>,
  registros: ReadonlyMap<string, Conciliacion>,
  finDelMes: string,
): Set<string> {
  const anteriores = new Set<string>();
  for (const [id, movimientoIds] of marcas) {
    const conciliacion = registros.get(id);
    if (!conciliacion || conciliacion.finDelMes() >= finDelMes) continue;
    for (const movimientoId of movimientoIds) anteriores.add(movimientoId);
  }
  return anteriores;
}

/** Si alguna de esas conciliaciones es de un mes anterior a `periodo`. */
export function hayAnteriorEnMemoria(conciliaciones: readonly Conciliacion[], periodo: Periodo): boolean {
  const meses = ({ anio, mes }: Periodo) => anio * 12 + mes;
  return conciliaciones.some((conciliacion) => meses(conciliacion.instantanea()) < meses(periodo));
}
