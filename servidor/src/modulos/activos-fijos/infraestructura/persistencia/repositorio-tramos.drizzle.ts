import { and, asc, desc, eq, lt, sql, type SQL } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { RepositorioTramos, TramosDeCambio, TramosNuevos } from '../../aplicacion/puertos/repositorio-tramos.js';
import type { TramoCalculado, TramoGuardado } from '../../dominio/depreciacion/tramo.js';
import { cuotas } from './cuotas.tablas.js';
import { divisiones } from './divisiones.tablas.js';
import { horaReal } from './hora-real.js';
import { mejoras } from './mejoras.tablas.js';
import { mapeadorDeTramo } from './tramo.mapeador.js';
import { tramos } from './tramos.tablas.js';

/** Un tramo de una mejora que se acaba de apagar: de dónde sale lo que hay que reponer. */
interface TramoApagado {
  activoId: string;
  libro: TramoCalculado['libro'];
  desdePeriodo: string;
  creadoEn: Date;
}

/** Las tablas tienen seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RepositorioTramosDrizzle implements RepositorioTramos {
  async agregarVarios({ empresaId, activoId, tramos: nuevos }: TramosNuevos): Promise<void> {
    if (nuevos.length === 0) return;
    await transaccionEnCurso()
      .insert(tramos)
      .values(nuevos.map((tramo) => ({ ...mapeadorDeTramo.aFila(empresaId, activoId, tramo), creadoEn: horaReal() })));
  }

  async vigentesDeActivo(activoId: string): Promise<TramoCalculado[]> {
    return this.vigentesConIdDeActivo(activoId);
  }

  async vigentesConIdDeActivo(activoId: string): Promise<TramoGuardado[]> {
    const filas = await transaccionEnCurso()
      .select()
      .from(tramos)
      .where(and(eq(tramos.activoId, activoId), eq(tramos.vigente, true)))
      .orderBy(asc(tramos.desdePeriodo), asc(tramos.libro));
    return filas.map((fila) => ({ ...mapeadorDeTramo.aTramo(fila), id: fila.id }));
  }

  async reemplazar({ empresaId, activoId, mejoraId, divisionId, tramos: nuevos }: TramosDeCambio): Promise<void> {
    const transaccion = transaccionEnCurso();
    for (const tramo of nuevos) {
      await transaccion
        .update(tramos)
        .set({ vigente: false })
        .where(
          and(
            eq(tramos.activoId, activoId),
            eq(tramos.libro, tramo.libro),
            eq(tramos.desdePeriodo, tramo.desdePeriodo),
            eq(tramos.vigente, true),
          ),
        );
      const fila = mapeadorDeTramo.aFila(empresaId, activoId, tramo);
      await transaccion
        .insert(tramos)
        .values({ ...fila, mejoraId, divisionId: divisionId ?? null, creadoEn: horaReal() });
    }
  }

  async anularDeMejora(mejoraId: string): Promise<void> {
    await this.apagarYReponer(eq(tramos.mejoraId, mejoraId));
  }

  async anularDeDivision(divisionId: string): Promise<void> {
    await this.apagarYReponer(eq(tramos.divisionId, divisionId));
  }

  private async apagarYReponer(donde: SQL): Promise<void> {
    const apagados = await transaccionEnCurso()
      .update(tramos)
      .set({ vigente: false })
      .where(and(donde, eq(tramos.vigente, true)))
      .returning({
        activoId: tramos.activoId,
        libro: tramos.libro,
        desdePeriodo: tramos.desdePeriodo,
        creadoEn: tramos.creadoEn,
      });
    for (const apagado of apagados) await this.reponerSustituido(apagado);
  }

  /** El tramo del mismo libro y mes más reciente que ya existía y no es de una mejora ni una división anuladas vuelve a regir. */
  private async reponerSustituido(apagado: TramoApagado): Promise<void> {
    const transaccion = transaccionEnCurso();
    const [previo] = await transaccion
      .select({ id: tramos.id })
      .from(tramos)
      .where(
        and(
          eq(tramos.activoId, apagado.activoId),
          eq(tramos.libro, apagado.libro),
          eq(tramos.desdePeriodo, apagado.desdePeriodo),
          eq(tramos.vigente, false),
          lt(tramos.creadoEn, apagado.creadoEn),
          sql`(${tramos.mejoraId} is null or not exists (
            select 1 from ${mejoras} where ${mejoras.id} = ${tramos.mejoraId} and ${mejoras.estado} = 'anulada'))`,
          sql`(${tramos.divisionId} is null or not exists (
            select 1 from ${divisiones} where ${divisiones.id} = ${tramos.divisionId} and ${divisiones.estado} = 'anulada'))`,
        ),
      )
      .orderBy(desc(tramos.creadoEn))
      .limit(1);
    if (previo) await transaccion.update(tramos).set({ vigente: true }).where(eq(tramos.id, previo.id));
  }

  async hayCambiosPosterioresALaMejora(mejoraId: string): Promise<boolean> {
    const resultado = await transaccionEnCurso().execute<{ hay: boolean }>(sql`
      select exists (
        select 1 from ${tramos} t
        where t.vigente
          and t.activo_id = (select m.activo_id from ${mejoras} m where m.id = ${mejoraId})
          and t.creado_en > (select max(propios.creado_en) from ${tramos} propios where propios.mejora_id = ${mejoraId})
      ) as hay`);
    return resultado.rows[0]?.hay === true;
  }

  /**
   * Los tramos que ninguna cuota señala se borran; los que una cuota de un mes reabierto aún señala (esa cuota se
   * conserva) dejan de ser vigentes en vez de borrarse.
   */
  async eliminarDeActivo(activoId: string): Promise<void> {
    const transaccion = transaccionEnCurso();
    await transaccion
      .delete(tramos)
      .where(
        and(
          eq(tramos.activoId, activoId),
          sql`not exists (select 1 from ${cuotas} where ${cuotas.tramoId} = ${tramos.id})`,
        ),
      );
    await transaccion
      .update(tramos)
      .set({ vigente: false })
      .where(and(eq(tramos.activoId, activoId), eq(tramos.vigente, true)));
  }
}
