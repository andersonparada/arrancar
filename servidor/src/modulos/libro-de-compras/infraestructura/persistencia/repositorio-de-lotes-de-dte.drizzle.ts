import { desc, eq } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { RepositorioDeLotesDeDte } from '../../aplicacion/puertos/repositorio-de-lotes-de-dte.js';
import type { LoteDeDte } from '../../dominio/lote-de-dte.js';
import { mapeadorDeLoteDeDte } from './lote-de-dte.mapeador.js';
import { lotesDeDte } from './lotes-de-dte.tablas.js';

/** La tabla tiene seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RepositorioDeLotesDeDteDrizzle implements RepositorioDeLotesDeDte {
  async agregar(lote: LoteDeDte): Promise<void> {
    await transaccionEnCurso().insert(lotesDeDte).values(mapeadorDeLoteDeDte.aFila(lote));
  }

  async buscar(id: string): Promise<LoteDeDte | null> {
    const [fila] = await transaccionEnCurso().select().from(lotesDeDte).where(eq(lotesDeDte.id, id));
    return fila ? mapeadorDeLoteDeDte.aLote(fila) : null;
  }

  async buscarPorSha256(sha256: string): Promise<LoteDeDte | null> {
    const [fila] = await transaccionEnCurso()
      .select()
      .from(lotesDeDte)
      .where(eq(lotesDeDte.sha256, sha256))
      .orderBy(desc(lotesDeDte.creadoEn))
      .limit(1);
    return fila ? mapeadorDeLoteDeDte.aLote(fila) : null;
  }
}
