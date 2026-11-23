import { eq } from 'drizzle-orm';
import { RecursoEnUso } from '../../../core/compartido/aplicacion/errores.js';
import { interpretarErrorDePostgres } from '../../../core/compartido/infraestructura/errores-de-postgres.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { RepositorioParcelas } from '../../aplicacion/puertos/repositorio-parcelas.js';
import { ParcelaConRegistros } from '../../dominio/errores-de-parcela.js';
import type { Parcela, ParcelaId } from '../../dominio/parcela.js';
import { mapeadorDeParcela } from './parcela.mapeador.js';
import { parcelas } from './parcelas.tablas.js';

/** La tabla tiene seguridad por empresa y por localidad (RLS): ninguna consulta necesita filtrar. */
export class RepositorioParcelasDrizzle implements RepositorioParcelas {
  async buscar(id: ParcelaId): Promise<Parcela | null> {
    const [fila] = await transaccionEnCurso().select().from(parcelas).where(eq(parcelas.id, id.valor));
    return fila ? mapeadorDeParcela.aEntidad(fila) : null;
  }

  async buscarBloqueando(id: ParcelaId): Promise<Parcela | null> {
    const [fila] = await transaccionEnCurso().select().from(parcelas).where(eq(parcelas.id, id.valor)).for('update');
    return fila ? mapeadorDeParcela.aEntidad(fila) : null;
  }

  async agregar(parcela: Parcela): Promise<void> {
    await transaccionEnCurso().insert(parcelas).values(mapeadorDeParcela.aFila(parcela));
  }

  async guardar(parcela: Parcela): Promise<void> {
    await transaccionEnCurso()
      .update(parcelas)
      .set(mapeadorDeParcela.aFila(parcela))
      .where(eq(parcelas.id, parcela.id.valor));
  }

  /** @throws ParcelaConRegistros si algo la usa: las llaves hacia la parcela son `no action`. */
  async eliminar(parcela: Parcela): Promise<void> {
    try {
      await transaccionEnCurso().delete(parcelas).where(eq(parcelas.id, parcela.id.valor));
    } catch (error) {
      if (interpretarErrorDePostgres(error) instanceof RecursoEnUso) throw new ParcelaConRegistros();
      throw error;
    }
  }
}
