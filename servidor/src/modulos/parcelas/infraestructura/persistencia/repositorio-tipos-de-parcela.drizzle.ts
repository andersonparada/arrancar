import { eq } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { RepositorioTiposDeParcela } from '../../aplicacion/puertos/repositorio-tipos-de-parcela.js';
import type { TipoDeParcela, TipoDeParcelaId } from '../../dominio/tipo-de-parcela.js';
import { mapeadorDeTipoDeParcela } from './tipo-de-parcela.mapeador.js';
import { tiposDeParcela } from './tipos-de-parcela.tablas.js';

/** La tabla tiene seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RepositorioTiposDeParcelaDrizzle implements RepositorioTiposDeParcela {
  async buscar(id: TipoDeParcelaId): Promise<TipoDeParcela | null> {
    const [fila] = await transaccionEnCurso().select().from(tiposDeParcela).where(eq(tiposDeParcela.id, id.valor));
    return fila ? mapeadorDeTipoDeParcela.aEntidad(fila) : null;
  }

  async agregar(tipoDeParcela: TipoDeParcela): Promise<void> {
    await transaccionEnCurso().insert(tiposDeParcela).values(mapeadorDeTipoDeParcela.aFila(tipoDeParcela));
  }

  async guardar(tipoDeParcela: TipoDeParcela): Promise<void> {
    await transaccionEnCurso()
      .update(tiposDeParcela)
      .set(mapeadorDeTipoDeParcela.aFila(tipoDeParcela))
      .where(eq(tiposDeParcela.id, tipoDeParcela.id.valor));
  }

  async eliminar(tipoDeParcela: TipoDeParcela): Promise<void> {
    await transaccionEnCurso().delete(tiposDeParcela).where(eq(tiposDeParcela.id, tipoDeParcela.id.valor));
  }

  async hayAlguno(): Promise<boolean> {
    const [fila] = await transaccionEnCurso().select({ id: tiposDeParcela.id }).from(tiposDeParcela).limit(1);
    return fila !== undefined;
  }

  async sembrar(tipos: readonly TipoDeParcela[]): Promise<void> {
    if (tipos.length === 0) return;
    const filas = tipos.map((tipo) => mapeadorDeTipoDeParcela.aFila(tipo));
    await transaccionEnCurso().insert(tiposDeParcela).values(filas).onConflictDoNothing();
  }
}
