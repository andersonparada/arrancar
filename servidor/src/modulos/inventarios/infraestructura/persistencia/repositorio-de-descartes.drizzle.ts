import { and, eq } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  DescarteDeLinea,
  NuevoDescarte,
  RepositorioDeDescartes,
} from '../../aplicacion/puertos/repositorio-de-descartes.js';
import { descartesDeLineas } from './descartes.tablas.js';

/** Las tablas tienen seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RepositorioDeDescartesDrizzle implements RepositorioDeDescartes {
  async vigente(lineaId: string): Promise<DescarteDeLinea | null> {
    const [fila] = await transaccionEnCurso()
      .select()
      .from(descartesDeLineas)
      .where(and(eq(descartesDeLineas.lineaDeDocumentoId, lineaId), eq(descartesDeLineas.vigente, true)));
    if (!fila) return null;
    return {
      id: fila.id,
      lineaId,
      documentoId: fila.documentoDeCompraId,
      motivo: fila.motivo,
      quitoLaMarca: fila.quitoLaMarca,
    };
  }

  async agregar({ empresaId, lineaId, documentoId, motivo, quitoLaMarca }: NuevoDescarte): Promise<void> {
    await transaccionEnCurso()
      .insert(descartesDeLineas)
      .values({ empresaId, documentoDeCompraId: documentoId, lineaDeDocumentoId: lineaId, motivo, quitoLaMarca });
  }

  async devolver(descarteId: string, usuarioId: string, ahora: Date): Promise<void> {
    await transaccionEnCurso()
      .update(descartesDeLineas)
      .set({ vigente: false, devueltoEn: ahora, devueltoPor: usuarioId })
      .where(eq(descartesDeLineas.id, descarteId));
  }
}
