import { eq } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { RepositorioFormatosDeCheque } from '../../aplicacion/puertos/repositorio-formatos-de-cheque.js';
import type { FormatoGuardado, FormatoGuardadoId } from '../../dominio/formato-guardado.js';
import { mapeadorDeFormatoDeCheque } from './formato-de-cheque.mapeador.js';
import { formatosDeCheque } from './formatos-de-cheque.tablas.js';

/** La tabla tiene seguridad por cuenta (RLS): ninguna consulta necesita filtrar por cuenta. */
export class RepositorioFormatosDeChequeDrizzle implements RepositorioFormatosDeCheque {
  async buscar(id: FormatoGuardadoId): Promise<FormatoGuardado | null> {
    const [fila] = await transaccionEnCurso().select().from(formatosDeCheque).where(eq(formatosDeCheque.id, id.valor));
    return fila ? mapeadorDeFormatoDeCheque.aEntidad(fila) : null;
  }

  async agregar(formato: FormatoGuardado): Promise<void> {
    await transaccionEnCurso().insert(formatosDeCheque).values(mapeadorDeFormatoDeCheque.aFila(formato));
  }

  async guardar(formato: FormatoGuardado): Promise<void> {
    await transaccionEnCurso()
      .update(formatosDeCheque)
      .set(mapeadorDeFormatoDeCheque.aFila(formato))
      .where(eq(formatosDeCheque.id, formato.id.valor));
  }

  async eliminar(id: FormatoGuardadoId): Promise<void> {
    await transaccionEnCurso().delete(formatosDeCheque).where(eq(formatosDeCheque.id, id.valor));
  }
}
