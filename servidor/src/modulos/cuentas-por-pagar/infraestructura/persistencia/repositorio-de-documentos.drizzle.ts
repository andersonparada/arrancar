import { eq } from 'drizzle-orm';
import {
  contextoEnCurso,
  transaccionEnCurso,
} from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { DocumentoNuevo, RepositorioDeDocumentos } from '../../aplicacion/puertos/puertos-de-documentos.js';
import type { DocumentoPorPagar } from '../../dominio/documento-por-pagar.js';
import { mapeadorDeDocumento } from './documento.mapeador.js';
import { documentos } from './documentos.tablas.js';

/** La tabla tiene seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RepositorioDeDocumentosDrizzle implements RepositorioDeDocumentos {
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
}
