import { asc, eq, sql } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  AnulacionDeDocumento,
  DocumentoGuardado,
  RepositorioDeDocumentosGuardados,
} from '../../aplicacion/puertos/puertos-de-baja-de-documentos.js';
import { mapeadorDeDocumentoGuardado } from './documento-guardado.mapeador.js';
import { documentos } from './documentos.tablas.js';
import { lineasDeDocumento } from './lineas-de-documento.tablas.js';
import { retenciones } from './retenciones.tablas.js';

/** La tabla tiene seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RepositorioDeDocumentosGuardadosDrizzle implements RepositorioDeDocumentosGuardados {
  async buscar(id: string, bloquear: boolean): Promise<DocumentoGuardado | null> {
    const transaccion = transaccionEnCurso();
    const consulta = transaccion.select().from(documentos).where(eq(documentos.id, id));
    const [documento] = await (bloquear ? consulta.for('update') : consulta);
    if (!documento) return null;
    const lineas = await transaccion.select().from(lineasDeDocumento).where(eq(lineasDeDocumento.documentoId, id));
    const retenidas = await transaccion.select().from(retenciones).where(eq(retenciones.documentoId, id));
    const notas = await transaccion
      .select()
      .from(documentos)
      .where(eq(documentos.documentoAfectadoId, id))
      .orderBy(asc(documentos.fechaEmision), asc(documentos.creadoEn));
    return mapeadorDeDocumentoGuardado.aDominio({ documento, lineas, retenciones: retenidas, notas });
  }

  async anular(id: string, { anuladoPor, motivo }: AnulacionDeDocumento): Promise<void> {
    await transaccionEnCurso()
      .update(documentos)
      .set({ estado: 'anulado', anuladoEn: sql`now()`, anuladoPor, motivoDeAnulacion: motivo })
      .where(eq(documentos.id, id));
  }

  async eliminar(id: string): Promise<void> {
    await transaccionEnCurso().delete(documentos).where(eq(documentos.id, id));
  }

  async marcarProcesado(id: string, procesado: boolean): Promise<void> {
    await transaccionEnCurso()
      .update(documentos)
      .set({ procesadoEnDestinoEn: procesado ? sql`now()` : null })
      .where(eq(documentos.id, id));
  }
}
