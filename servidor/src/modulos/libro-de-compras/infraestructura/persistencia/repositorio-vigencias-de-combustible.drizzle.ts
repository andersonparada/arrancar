import { and, eq, isNull } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { RepositorioVigenciasDeCombustible } from '../../aplicacion/puertos/repositorio-vigencias-de-combustible.js';
import type {
  UsoDeVigencia,
  VigenciaDeCombustible,
  VigenciaDeCombustibleId,
} from '../../dominio/vigencia-de-combustible.js';
import { combustibles } from './combustibles.tablas.js';
import { mapeadorDeVigenciaDeCombustible } from './vigencia-de-combustible.mapeador.js';
import { vigenciasDeCombustible } from './vigencias-de-combustible.tablas.js';

/** La tabla tiene seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RepositorioVigenciasDeCombustibleDrizzle implements RepositorioVigenciasDeCombustible {
  async buscar(id: VigenciaDeCombustibleId): Promise<VigenciaDeCombustible | null> {
    const [fila] = await transaccionEnCurso()
      .select()
      .from(vigenciasDeCombustible)
      .where(eq(vigenciasDeCombustible.id, id.valor));
    return fila ? mapeadorDeVigenciaDeCombustible.aEntidad(fila) : null;
  }

  async buscarAbierta(combustibleId: string): Promise<VigenciaDeCombustible | null> {
    const [fila] = await transaccionEnCurso()
      .select()
      .from(vigenciasDeCombustible)
      .where(and(eq(vigenciasDeCombustible.combustibleId, combustibleId), isNull(vigenciasDeCombustible.vigenteHasta)));
    return fila ? mapeadorDeVigenciaDeCombustible.aEntidad(fila) : null;
  }

  async bloquearCombustible(combustibleId: string): Promise<void> {
    await transaccionEnCurso()
      .select({ id: combustibles.id })
      .from(combustibles)
      .where(eq(combustibles.id, combustibleId))
      .for('update');
  }

  /** Hasta L3 no existen las líneas de documento que aplican una vigencia: nada la usa todavía. */
  async enUso(_id: VigenciaDeCombustibleId): Promise<UsoDeVigencia | null> {
    return null;
  }

  async agregar(vigenciaDeCombustible: VigenciaDeCombustible): Promise<void> {
    await transaccionEnCurso()
      .insert(vigenciasDeCombustible)
      .values(mapeadorDeVigenciaDeCombustible.aFila(vigenciaDeCombustible));
  }

  async guardar(vigenciaDeCombustible: VigenciaDeCombustible): Promise<void> {
    await transaccionEnCurso()
      .update(vigenciasDeCombustible)
      .set(mapeadorDeVigenciaDeCombustible.aFila(vigenciaDeCombustible))
      .where(eq(vigenciasDeCombustible.id, vigenciaDeCombustible.id.valor));
  }

  async eliminar(vigenciaDeCombustible: VigenciaDeCombustible): Promise<void> {
    await transaccionEnCurso()
      .delete(vigenciasDeCombustible)
      .where(eq(vigenciasDeCombustible.id, vigenciaDeCombustible.id.valor));
  }
}
