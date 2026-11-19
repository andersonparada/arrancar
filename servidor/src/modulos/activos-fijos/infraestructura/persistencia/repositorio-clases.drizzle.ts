import { eq } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { RepositorioClases } from '../../aplicacion/puertos/repositorio-clases.js';
import type { Clase, ClaseId } from '../../dominio/clase.js';
import { mapeadorDeClase } from './clase.mapeador.js';
import { clases } from './clases.tablas.js';
import { clasesPorConcepto } from './clases-por-concepto.tablas.js';

/** La tabla tiene seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RepositorioClasesDrizzle implements RepositorioClases {
  async buscar(id: ClaseId): Promise<Clase | null> {
    const [fila] = await transaccionEnCurso().select().from(clases).where(eq(clases.id, id.valor));
    return fila ? mapeadorDeClase.aEntidad(fila) : null;
  }

  async agregar(clase: Clase): Promise<void> {
    await transaccionEnCurso().insert(clases).values(mapeadorDeClase.aFila(clase));
  }

  async guardar(clase: Clase): Promise<void> {
    await transaccionEnCurso().update(clases).set(mapeadorDeClase.aFila(clase)).where(eq(clases.id, clase.id.valor));
  }

  async eliminar(clase: Clase): Promise<void> {
    await transaccionEnCurso().delete(clases).where(eq(clases.id, clase.id.valor));
  }

  /** Los conceptos ligados; los activos (AF-2) se suman aquí cuando exista su tabla. */
  async enUso(id: ClaseId): Promise<boolean> {
    const [ligado] = await transaccionEnCurso()
      .select({ conceptoDeGastoId: clasesPorConcepto.conceptoDeGastoId })
      .from(clasesPorConcepto)
      .where(eq(clasesPorConcepto.claseId, id.valor))
      .limit(1);
    return ligado !== undefined;
  }

  async hayAlguna(): Promise<boolean> {
    const [fila] = await transaccionEnCurso().select({ id: clases.id }).from(clases).limit(1);
    return fila !== undefined;
  }

  async sembrar(nuevas: readonly Clase[]): Promise<void> {
    if (nuevas.length === 0) return;
    const filas = nuevas.map((clase) => mapeadorDeClase.aFila(clase));
    await transaccionEnCurso().insert(clases).values(filas).onConflictDoNothing();
  }
}
