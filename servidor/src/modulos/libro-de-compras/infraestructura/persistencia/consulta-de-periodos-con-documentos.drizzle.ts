import { and, eq } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { ConsultaDePeriodosConDocumentos } from '../../aplicacion/puertos/repositorios-de-datos-fiscales.js';
import { documentos } from './documentos.tablas.js';

/** Los períodos de la empresa con documentos vigentes (cubre el índice `documentos_libro_idx`). */
export class ConsultaDePeriodosConDocumentosDrizzle implements ConsultaDePeriodosConDocumentos {
  async periodosConDocumentosVigentes(empresaId: string): Promise<string[]> {
    const filas = await transaccionEnCurso()
      .selectDistinct({ periodo: documentos.periodo })
      .from(documentos)
      .where(and(eq(documentos.empresaId, empresaId), eq(documentos.estado, 'vigente')))
      .orderBy(documentos.periodo);
    return filas.map((fila) => fila.periodo);
  }
}
