import { and, eq, inArray, sql } from 'drizzle-orm';
import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { RepositorioCostos } from '../../aplicacion/puertos/repositorio-costos.js';
import type { Costo, CostoId } from '../../dominio/costo.js';
import { activos } from './activos.tablas.js';
import { costos } from './costos.tablas.js';
import { mapeadorDeCosto } from './costo.mapeador.js';
import { enTandas } from './en-tandas.js';

const vigente = eq(costos.estado, 'vigente');

/** Las tablas tienen seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RepositorioCostosDrizzle implements RepositorioCostos {
  async agregarVarios(nuevos: readonly Costo[]): Promise<void> {
    const transaccion = transaccionEnCurso();
    for (const tanda of enTandas(nuevos)) {
      await transaccion.insert(costos).values(tanda.map((costo) => mapeadorDeCosto.aFila(costo)));
    }
  }

  async buscar(id: CostoId): Promise<Costo | null> {
    const [fila] = await transaccionEnCurso().select().from(costos).where(eq(costos.id, id.valor));
    return fila ? mapeadorDeCosto.aEntidad(fila) : null;
  }

  async guardar(costo: Costo): Promise<void> {
    await transaccionEnCurso().update(costos).set(mapeadorDeCosto.aFila(costo)).where(eq(costos.id, costo.id.valor));
  }

  /** Un candado de la transacción por línea, tomado en orden para que dos operaciones no se esperen en círculo. */
  async bloquearLineas(lineaIds: readonly string[]): Promise<void> {
    const transaccion = transaccionEnCurso();
    for (const id of [...new Set(lineaIds)].sort()) {
      const clave = `activos-fijos.linea:${id}`;
      await transaccion.execute(sql`select pg_advisory_xact_lock(hashtextextended(${clave}, 0))`);
    }
  }

  async totalesVigentes(activoIds: readonly string[]): Promise<Map<string, number>> {
    const totales = new Map<string, number>(activoIds.map((id) => [id, 0]));
    if (activoIds.length === 0) return totales;
    const filas = await transaccionEnCurso()
      .select({ activoId: costos.activoId, total: sql<string>`sum(${costos.monto})` })
      .from(costos)
      .where(and(inArray(costos.activoId, [...activoIds]), vigente))
      .groupBy(costos.activoId);
    for (const fila of filas) totales.set(fila.activoId, aCentavos(fila.total));
    return totales;
  }

  async codigosDeActivosConCostosDelDocumento(documentoId: string): Promise<string[]> {
    const filas = await transaccionEnCurso()
      .selectDistinct({ codigo: activos.codigo })
      .from(costos)
      .innerJoin(activos, eq(activos.id, costos.activoId))
      .where(and(eq(costos.documentoDeCompraId, documentoId), vigente))
      .orderBy(activos.codigo);
    return filas.map((fila) => fila.codigo);
  }
}
