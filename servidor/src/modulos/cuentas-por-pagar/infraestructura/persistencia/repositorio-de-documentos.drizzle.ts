import { eq, sql } from 'drizzle-orm';
import {
  contextoEnCurso,
  transaccionEnCurso,
} from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  AnulacionDeDocumento,
  DocumentoNuevo,
  RepositorioDeAplicaciones,
  RepositorioDeDocumentos,
} from '../../aplicacion/puertos/puertos-de-documentos.js';
import type { DocumentoConAplicaciones, DocumentoPorPagar } from '../../dominio/documento-por-pagar.js';
import { mapeadorDeDocumento } from './documento.mapeador.js';
import { documentos } from './documentos.tablas.js';

/** La tabla tiene seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RepositorioDeDocumentosDrizzle implements RepositorioDeDocumentos {
  constructor(private readonly aplicaciones: RepositorioDeAplicaciones) {}

  async existe(documentoId: string): Promise<boolean> {
    const [fila] = await transaccionEnCurso()
      .select({ id: documentos.id })
      .from(documentos)
      .where(eq(documentos.documentoId, documentoId));
    return fila !== undefined;
  }

  async agregar(nuevo: DocumentoNuevo): Promise<DocumentoPorPagar> {
    const valores = { ...mapeadorDeDocumento.aFila(nuevo), empresaId: contextoEnCurso().empresaId };
    const [fila] = await transaccionEnCurso().insert(documentos).values(valores).returning();
    return mapeadorDeDocumento.aDominio(fila!);
  }

  async buscarPorDocumentoDeCompra(documentoId: string, bloquear: boolean): Promise<DocumentoConAplicaciones | null> {
    const consulta = transaccionEnCurso().select().from(documentos).where(eq(documentos.documentoId, documentoId));
    const [fila] = await (bloquear ? consulta.for('update') : consulta);
    if (!fila) return null;
    const documento = mapeadorDeDocumento.aDominio(fila);
    return {
      documento,
      hechas: await this.aplicaciones.hechasPorLaNota(documento.id),
      recibidas: await this.aplicaciones.recibidasPorElCargo(documento.id),
    };
  }

  async anular(id: string, { anuladoPor, motivo, estabaAutorizado }: AnulacionDeDocumento): Promise<void> {
    await transaccionEnCurso()
      .update(documentos)
      .set({ estado: 'anulado', anuladoEn: sql`now()`, anuladoPor, motivoDeAnulacion: motivo, estabaAutorizado })
      .where(eq(documentos.id, id));
  }

  async eliminar(id: string): Promise<void> {
    await transaccionEnCurso().delete(documentos).where(eq(documentos.id, id));
  }
}
