import { and, eq, gt, or, sql } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { ConsultasDeUsoDelKardex } from '../../aplicacion/puertos/consultas-de-uso-del-kardex.js';
import { documentos } from './documentos.tablas.js';
import { existencias } from './existencias.tablas.js';
import { movimientos } from './movimientos.tablas.js';
import { saldosDeArticulos } from './saldos-de-articulos.tablas.js';

/** Las tablas tienen seguridad por empresa (RLS): ninguna consulta filtra por empresa. */
export class ConsultasDeUsoDelKardexDrizzle implements ConsultasDeUsoDelKardex {
  async articuloConMovimientos(articuloId: string): Promise<boolean> {
    const transaccion = transaccionEnCurso();
    await transaccion.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`inventarios.articulo:${articuloId}`}, 0))`,
    );
    const filas = await transaccion
      .select({ id: movimientos.id })
      .from(movimientos)
      .where(eq(movimientos.articuloId, articuloId))
      .limit(1);
    return filas.length > 0;
  }

  async articuloConExistencias(articuloId: string): Promise<boolean> {
    const filas = await transaccionEnCurso()
      .select({ articuloId: saldosDeArticulos.articuloId })
      .from(saldosDeArticulos)
      .where(and(eq(saldosDeArticulos.articuloId, articuloId), gt(saldosDeArticulos.cantidad, '0')))
      .limit(1);
    return filas.length > 0;
  }

  async bodegaConExistencias(bodegaId: string): Promise<boolean> {
    const filas = await transaccionEnCurso()
      .select({ bodegaId: existencias.bodegaId })
      .from(existencias)
      .where(and(eq(existencias.bodegaId, bodegaId), gt(existencias.cantidad, '0')))
      .limit(1);
    return filas.length > 0;
  }

  /** Lee con la seguridad por bodega: quien ve la bodega ve todo traslado que sale de ella o llega a ella. */
  async bodegaConTrasladosEnTransito(bodegaId: string): Promise<boolean> {
    const filas = await transaccionEnCurso()
      .select({ id: documentos.id })
      .from(documentos)
      .where(
        and(
          eq(documentos.clase, 'salida_de_traslado'),
          eq(documentos.estado, 'vigente'),
          eq(documentos.estadoDeTraslado, 'en_transito'),
          or(eq(documentos.bodegaId, bodegaId), eq(documentos.bodegaDeDestinoId, bodegaId)),
        ),
      )
      .limit(1);
    return filas.length > 0;
  }
}
