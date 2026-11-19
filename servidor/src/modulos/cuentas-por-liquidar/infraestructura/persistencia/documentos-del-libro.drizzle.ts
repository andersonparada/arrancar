import { eq } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { documentos } from '../../../libro-de-compras/infraestructura/persistencia/documentos.tablas.js';
import type { DatosDelDocumentoDelLibro, DocumentosDelLibro } from '../../aplicacion/puertos/puertos-de-gastos.js';

/**
 * Lee de Libro de compras lo que no viaja en la orden `recibir_documento` y nunca cambia (el documento no se edita). La
 * fila ya existe: el libro la guarda antes de mandar la orden, en la misma transacción.
 */
export class DocumentosDelLibroDrizzle implements DocumentosDelLibro {
  async datosDe(documentoId: string): Promise<DatosDelDocumentoDelLibro> {
    const [fila] = await transaccionEnCurso()
      .select({
        tipo: documentos.tipo,
        serie: documentos.serie,
        numero: documentos.numero,
        fechaEmision: documentos.fechaEmision,
        proveedorNombre: documentos.nombreEmisor,
        motivoFueraDelLibro: documentos.motivoFueraDelLibro,
      })
      .from(documentos)
      .where(eq(documentos.id, documentoId));
    if (!fila) throw new Error(`El documento ${documentoId} de Libro de compras no existe.`);
    return fila;
  }
}
