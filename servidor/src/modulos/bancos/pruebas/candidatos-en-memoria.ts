import type { MovimientoConMarcaDto } from '../aplicacion/dto/conciliacion.dto.js';
import type { MovimientoDto } from '../aplicacion/dto/movimiento.dto.js';

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
