import { and, eq } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { MarcasDeInventario } from '../../aplicacion/puertos/puertos-de-marca-de-inventario.js';
import type { LineaParaMarcar } from '../../dominio/marca-de-inventario.js';
import { documentos } from './documentos.tablas.js';
import { lineasDeDocumento } from './lineas-de-documento.tablas.js';

/** Las líneas del libro de la empresa activa (RLS por empresa). */
export class MarcasDeInventarioDrizzle implements MarcasDeInventario {
  async buscar(lineaId: string, documentoId: string): Promise<LineaParaMarcar | null> {
    const transaccion = transaccionEnCurso();
    const [documento] = await transaccion
      .select({ estado: documentos.estado })
      .from(documentos)
      .where(eq(documentos.id, documentoId))
      .for('share');
    if (!documento) return null;
    const [linea] = await transaccion
      .select()
      .from(lineasDeDocumento)
      .where(and(eq(lineasDeDocumento.id, lineaId), eq(lineasDeDocumento.documentoId, documentoId)));
    if (!linea) return null;
    return {
      lineaId,
      documentoId,
      documentoVigente: documento.estado === 'vigente',
      numero: linea.numero,
      tipo: linea.tipo,
      esActivoFijo: linea.esActivoFijo,
      esInventario: linea.esInventario,
    };
  }

  async cambiar(lineaId: string, esInventario: boolean): Promise<void> {
    await transaccionEnCurso().update(lineasDeDocumento).set({ esInventario }).where(eq(lineasDeDocumento.id, lineaId));
  }
}
