import { and, eq } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  DescarteDeLinea,
  NuevoDescarte,
  RepositorioDescartes,
} from '../../aplicacion/puertos/repositorio-descartes.js';
import { descartesDeLineas } from './descartes.tablas.js';

/** Las tablas tienen seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RepositorioDescartesDrizzle implements RepositorioDescartes {
  async vigente(lineaId: string): Promise<DescarteDeLinea | null> {
    const [fila] = await transaccionEnCurso()
      .select()
      .from(descartesDeLineas)
      .where(and(eq(descartesDeLineas.lineaDeDocumentoId, lineaId), eq(descartesDeLineas.vigente, true)));
    return fila ? { id: fila.id, lineaId, documentoId: fila.documentoDeCompraId, motivo: fila.motivo } : null;
  }

  async agregar({ empresaId, lineaId, documentoId, motivo }: NuevoDescarte): Promise<void> {
    await transaccionEnCurso()
      .insert(descartesDeLineas)
      .values({ empresaId, documentoDeCompraId: documentoId, lineaDeDocumentoId: lineaId, motivo });
  }

  async devolver(descarteId: string, usuarioId: string, ahora: Date): Promise<void> {
    await transaccionEnCurso()
      .update(descartesDeLineas)
      .set({ vigente: false, devueltoEn: ahora, devueltoPor: usuarioId })
      .where(eq(descartesDeLineas.id, descarteId));
  }
}
