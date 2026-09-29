import { sql, type AnyColumn } from 'drizzle-orm';
import type { alias } from 'drizzle-orm/pg-core';
import type { HechosDeUnMovimiento } from '../../aplicacion/acciones-posibles.js';
import { conciliaciones } from './conciliaciones.tablas.js';
import type { movimientos } from './movimientos.tablas.js';

/** La tabla de movimientos, o un alias suyo (una misma consulta puede unirla dos veces). */
type AliasDeMovimientos = ReturnType<typeof alias<typeof movimientos, string>>;

/** Si `fecha` cae en un mes ya conciliado (autorizado) de la cuenta. */
export const mesConciliadoDe = (cuentaBancariaId: AnyColumn, fecha: AnyColumn) =>
  sql<boolean>`exists (
    select 1 from ${conciliaciones}
    where ${conciliaciones.cuentaBancariaId} = ${cuentaBancariaId}
      and ${conciliaciones.estado} = 'autorizada'
      and (make_date(${conciliaciones.anio}, ${conciliaciones.mes}, 1) + interval '1 month' - interval '1 day')::date >= ${fecha}
  )`;

/** Si la cuenta tiene alguna conciliación, de cualquier estado. */
export const cuentaConConciliacionesDe = (cuentaBancariaId: AnyColumn) =>
  sql<boolean>`exists (select 1 from ${conciliaciones} where ${conciliaciones.cuentaBancariaId} = ${cuentaBancariaId})`;

/** Las columnas de un movimiento (o de su alias) que hacen falta para saber qué se puede hacer con él. */
interface FilaConHechos {
  tipo: string;
  saldoInicial: boolean;
  transferenciaId: string | null;
  conciliacionId: string | null;
  anuladoEn: Date | null;
  revertidoEn: Date | null;
  revierteAId: string | null;
  moduloDeOrigen: string | null;
  mesConciliado: boolean;
  cuentaConConciliaciones: boolean;
}

/** Las columnas de un movimiento (o de su alias) que traen los hechos: para las consultas que los necesitan. */
export const columnasDeHechos = (movimiento: AliasDeMovimientos) => ({
  tipo: movimiento.tipo,
  saldoInicial: movimiento.saldoInicial,
  transferenciaId: movimiento.transferenciaId,
  conciliacionId: movimiento.conciliacionId,
  anuladoEn: movimiento.anuladoEn,
  revertidoEn: movimiento.revertidoEn,
  revierteAId: movimiento.revierteAId,
  moduloDeOrigen: movimiento.moduloDeOrigen,
  mesConciliado: mesConciliadoDe(movimiento.cuentaBancariaId, movimiento.fecha),
  cuentaConConciliaciones: cuentaConConciliacionesDe(movimiento.cuentaBancariaId),
});

/** Los hechos de un movimiento, a partir de las columnas que trajo la consulta. */
export function hechosDeLaFila(fila: FilaConHechos | null): HechosDeUnMovimiento {
  if (!fila) throw new Error('Se esperaba un movimiento y la consulta no lo trajo.');
  return {
    tipo: fila.tipo as HechosDeUnMovimiento['tipo'],
    saldoInicial: fila.saldoInicial,
    esDeTransferencia: fila.transferenciaId !== null,
    marcadoEnConciliacion: fila.conciliacionId !== null,
    anulado: fila.anuladoEn !== null,
    revertido: fila.revertidoEn !== null,
    esInverso: fila.revierteAId !== null,
    esDeOtroModulo: fila.moduloDeOrigen !== null,
    mesConciliado: fila.mesConciliado,
    cuentaConConciliaciones: fila.cuentaConConciliaciones,
  };
}
