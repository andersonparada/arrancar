import { eq } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { documentos as documentosDeCompra } from '../../../libro-de-compras/infraestructura/persistencia/documentos.tablas.js';
import type { DocumentosDeCompra } from '../../aplicacion/puertos/puertos-de-documentos.js';

/**
 * Lee de Libro de compras lo que no viaja en la orden `recibir_documento` y nunca cambia (el documento no se edita). La
 * fila ya existe: Libro de compras la guarda antes de mandar la orden, en la misma transacción.
 */
export class DocumentosDeCompraDrizzle implements DocumentosDeCompra {
  async fechaDeRecepcion(documentoId: string): Promise<string> {
    const [fila] = await transaccionEnCurso()
      .select({ fechaRecepcion: documentosDeCompra.fechaRecepcion })
      .from(documentosDeCompra)
      .where(eq(documentosDeCompra.id, documentoId));
    if (!fila) throw new Error(`El documento ${documentoId} de Libro de compras no existe.`);
    return fila.fechaRecepcion;
  }
}
