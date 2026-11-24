import { and, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { activos } from './activos.tablas.js';
import { bajas } from './bajas.tablas.js';

type FilaDeBaja = typeof bajas.$inferSelect;

/** Lo que identifica la baja cuyo acto se busca. */
type BajaBuscada = Pick<FilaDeBaja, 'id' | 'activoId' | 'numero' | 'anioDeNumero' | 'estado'>;

/**
 * La fila de la baja que lleva el acta y la denuncia del acto: la del principal cuando la baja es de un componente que se
 * dio de baja con él (misma acta y mismo estado); si no, la misma baja (`null`).
 */
export async function filaPortadoraDeDocumentos(baja: BajaBuscada): Promise<FilaDeBaja | null> {
  const delPrincipal = alias(bajas, 'baja_del_principal');
  const [fila] = await transaccionEnCurso()
    .select({ baja: delPrincipal })
    .from(activos)
    .innerJoin(
      delPrincipal,
      and(
        eq(delPrincipal.activoId, activos.activoPadreId),
        eq(delPrincipal.numero, baja.numero),
        eq(delPrincipal.anioDeNumero, baja.anioDeNumero),
        eq(delPrincipal.estado, baja.estado),
      ),
    )
    .where(eq(activos.id, baja.activoId));
  return fila?.baja ?? null;
}
