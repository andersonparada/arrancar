import { and, eq, ne, sql } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { RepositorioActivos } from '../../aplicacion/puertos/repositorio-activos.js';
import type { Activo, ActivoId } from '../../dominio/activo.js';
import { mapeadorDeActivo } from './activo.mapeador.js';
import { activos } from './activos.tablas.js';
import { traslados } from './traslados.tablas.js';

/** Las tablas tienen seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RepositorioActivosDrizzle implements RepositorioActivos {
  async buscar(id: ActivoId): Promise<Activo | null> {
    const [fila] = await transaccionEnCurso().select().from(activos).where(eq(activos.id, id.valor));
    return fila ? mapeadorDeActivo.aEntidad(fila) : null;
  }

  async agregar(activo: Activo): Promise<void> {
    const transaccion = transaccionEnCurso();
    await transaccion.insert(activos).values(mapeadorDeActivo.aFila(activo));
    const { id, empresaId, fechaDeAdquisicion, localidadId, departamentoId, responsable, enBodega } =
      activo.instantanea();
    await transaccion.insert(traslados).values({
      empresaId: empresaId.valor,
      activoId: id.valor,
      esAlta: true,
      fecha: fechaDeAdquisicion,
      localidadId,
      departamentoId,
      responsable,
      aBodega: enBodega,
    });
  }

  async guardar(activo: Activo): Promise<void> {
    await transaccionEnCurso()
      .update(activos)
      .set(mapeadorDeActivo.aFila(activo))
      .where(eq(activos.id, activo.id.valor));
  }

  async eliminar(activo: Activo): Promise<void> {
    const transaccion = transaccionEnCurso();
    await transaccion.delete(traslados).where(eq(traslados.activoId, activo.id.valor));
    await transaccion.delete(activos).where(eq(activos.id, activo.id.valor));
  }

  async existeCodigo(codigo: string): Promise<boolean> {
    const [fila] = await transaccionEnCurso()
      .select({ id: activos.id })
      .from(activos)
      .where(sql`upper(${activos.codigo}) = upper(${codigo})`)
      .limit(1);
    return fila !== undefined;
  }

  async tieneComponentes(id: ActivoId): Promise<boolean> {
    const [fila] = await transaccionEnCurso()
      .select({ id: activos.id })
      .from(activos)
      .where(eq(activos.activoPadreId, id.valor))
      .limit(1);
    return fila !== undefined;
  }

  async tieneMovimientos(id: ActivoId): Promise<boolean> {
    const [fila] = await transaccionEnCurso()
      .select({ id: traslados.id })
      .from(traslados)
      .where(and(eq(traslados.activoId, id.valor), ne(traslados.esAlta, true)))
      .limit(1);
    return fila !== undefined;
  }
}
