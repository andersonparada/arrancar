import { eq } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { RepositorioTiposDeLocalidad } from '../../aplicacion/puertos/repositorio-tipos-de-localidad.js';
import type { TipoDeLocalidad, TipoDeLocalidadId } from '../../dominio/tipo-de-localidad.js';
import { mapeadorDeTipoDeLocalidad } from './tipo-de-localidad.mapeador.js';
import { tiposDeLocalidad } from './tipos-de-localidad.tablas.js';

/** La tabla tiene seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RepositorioTiposDeLocalidadDrizzle implements RepositorioTiposDeLocalidad {
  async buscar(id: TipoDeLocalidadId): Promise<TipoDeLocalidad | null> {
    const [fila] = await transaccionEnCurso().select().from(tiposDeLocalidad).where(eq(tiposDeLocalidad.id, id.valor));
    return fila ? mapeadorDeTipoDeLocalidad.aEntidad(fila) : null;
  }

  async agregar(tipoDeLocalidad: TipoDeLocalidad): Promise<void> {
    await transaccionEnCurso().insert(tiposDeLocalidad).values(mapeadorDeTipoDeLocalidad.aFila(tipoDeLocalidad));
  }

  async guardar(tipoDeLocalidad: TipoDeLocalidad): Promise<void> {
    await transaccionEnCurso()
      .update(tiposDeLocalidad)
      .set(mapeadorDeTipoDeLocalidad.aFila(tipoDeLocalidad))
      .where(eq(tiposDeLocalidad.id, tipoDeLocalidad.id.valor));
  }

  async eliminar(tipoDeLocalidad: TipoDeLocalidad): Promise<void> {
    await transaccionEnCurso().delete(tiposDeLocalidad).where(eq(tiposDeLocalidad.id, tipoDeLocalidad.id.valor));
  }

  async hayAlguno(): Promise<boolean> {
    const [fila] = await transaccionEnCurso().select({ id: tiposDeLocalidad.id }).from(tiposDeLocalidad).limit(1);
    return fila !== undefined;
  }

  async sembrar(tipos: readonly TipoDeLocalidad[]): Promise<void> {
    if (tipos.length === 0) return;
    const filas = tipos.map((tipo) => mapeadorDeTipoDeLocalidad.aFila(tipo));
    await transaccionEnCurso().insert(tiposDeLocalidad).values(filas).onConflictDoNothing();
  }
}
