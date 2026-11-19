import { asc, eq, inArray, sql, type SQL } from 'drizzle-orm';
import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { cheques } from '../../../bancos/infraestructura/persistencia/cheques.tablas.js';
import type { LineaDePago, LineaDeReintegro } from '../../dominio/pagos.js';
import { conciliaciones } from '../../../bancos/infraestructura/persistencia/conciliaciones.tablas.js';
import { movimientos } from '../../../bancos/infraestructura/persistencia/movimientos.tablas.js';
import { aplicacionesDePagos } from './aplicaciones-de-pagos.tablas.js';
import { aplicacionesDeReintegros } from './aplicaciones-de-reintegros.tablas.js';
import { fechaDeEfectoDelPago, unionDeLaConciliacion } from './fecha-de-efecto-del-pago.sql.js';
import { pagos } from './pagos.tablas.js';
import { reintegros } from './reintegros.tablas.js';

/** Las líneas de pago (vigentes y anuladas) que cumplen la condición, de la más antigua a la más nueva. */
export async function lineasDePagoDonde(condicion: SQL): Promise<LineaDePago[]> {
  const filas = await transaccionEnCurso()
    .select({
      linea: aplicacionesDePagos,
      pago: pagos,
      numeroDeCheque: cheques.numero,
      fechaDeEfecto: sql<string>`${fechaDeEfectoDelPago}`,
    })
    .from(aplicacionesDePagos)
    .innerJoin(pagos, eq(pagos.id, aplicacionesDePagos.pagoId))
    .leftJoin(cheques, eq(cheques.movimientoId, pagos.movimientoId))
    .leftJoin(movimientos, eq(movimientos.id, pagos.movimientoId))
    .leftJoin(conciliaciones, unionDeLaConciliacion)
    .where(condicion)
    .orderBy(asc(pagos.creadoEn), asc(aplicacionesDePagos.creadoEn));
  return filas.map(aLineaDePago);
}

type FilaDeLineaDePago = {
  linea: typeof aplicacionesDePagos.$inferSelect;
  pago: typeof pagos.$inferSelect;
  numeroDeCheque: number | null;
  fechaDeEfecto: string;
};

const aLineaDePago = ({ linea, pago, numeroDeCheque, fechaDeEfecto }: FilaDeLineaDePago): LineaDePago => ({
  pagoId: pago.id,
  numero: pago.numero,
  anioDeNumero: pago.anioDeNumero,
  forma: pago.forma,
  numeroDeCheque,
  fecha: pago.fecha,
  fechaDeEfecto,
  estado: pago.estado,
  contrasenaId: linea.contrasenaId,
  cargoId: linea.cargoId,
  montoCentavos: aCentavos(linea.monto),
  retencionDescontadaCentavos: aCentavos(linea.retencionDescontada),
});

/** Lo que los pagos entregaron a un cargo. */
export const lineasDePagoDelCargo = (cargoId: string) => lineasDePagoDonde(eq(aplicacionesDePagos.cargoId, cargoId));

/**
 * Lo que los pagos entregaron en cada contraseña, buscado por `aplicaciones_de_pagos.contrasena_id` (la de la línea) y no
 * por la contraseña del pago.
 */
export async function lineasDePagoPorContrasena(contrasenaIds: readonly string[]): Promise<Map<string, LineaDePago[]>> {
  const porContrasena = new Map<string, LineaDePago[]>(contrasenaIds.map((id) => [id, []]));
  if (contrasenaIds.length === 0) return porContrasena;
  const lineas = await lineasDePagoDonde(inArray(aplicacionesDePagos.contrasenaId, [...contrasenaIds]));
  for (const linea of lineas) porContrasena.get(linea.contrasenaId)?.push(linea);
  return porContrasena;
}

/** Lo que los reintegros devolvieron contra una nota, vigentes y anulados. */
export async function lineasDeReintegroDeLaNota(notaId: string): Promise<LineaDeReintegro[]> {
  const filas = await transaccionEnCurso()
    .select({ linea: aplicacionesDeReintegros, reintegro: reintegros })
    .from(aplicacionesDeReintegros)
    .innerJoin(reintegros, eq(reintegros.id, aplicacionesDeReintegros.reintegroId))
    .where(eq(aplicacionesDeReintegros.notaId, notaId))
    .orderBy(asc(reintegros.creadoEn), asc(aplicacionesDeReintegros.creadoEn));
  return filas.map(({ linea, reintegro }) => ({
    reintegroId: reintegro.id,
    numero: reintegro.numero,
    anioDeNumero: reintegro.anioDeNumero,
    forma: reintegro.forma,
    fecha: reintegro.fecha,
    estado: reintegro.estado,
    notaId: linea.notaId,
    montoCentavos: aCentavos(linea.monto),
  }));
}
