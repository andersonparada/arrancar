import { inArray } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { documentos as documentosDeCompra } from '../../../libro-de-compras/infraestructura/persistencia/documentos.tablas.js';
import type { FechasDeEntrada } from '../../aplicacion/puertos/puertos-de-documentos.js';
import { documentos } from './documentos.tablas.js';

/** Lee la recepción de cada documento en Libro de compras, sin bloquear nada (las tablas tienen RLS por empresa). */
export class FechasDeEntradaDrizzle implements FechasDeEntrada {
  async deDocumentos(ids: readonly string[]): Promise<Map<string, string | null>> {
    if (ids.length === 0) return new Map();
    const propios = await transaccionEnCurso()
      .select({ id: documentos.id, documentoId: documentos.documentoId })
      .from(documentos)
      .where(inArray(documentos.id, [...ids]));
    const recepciones = await this.recepcionesDe(propios.flatMap(({ documentoId }) => documentoId ?? []));
    return new Map(
      propios.map(({ id, documentoId }) => [id, documentoId ? (recepciones.get(documentoId) ?? null) : null]),
    );
  }

  private async recepcionesDe(idsDelLibro: string[]): Promise<Map<string, string>> {
    if (idsDelLibro.length === 0) return new Map();
    const filas = await transaccionEnCurso()
      .select({ id: documentosDeCompra.id, fechaRecepcion: documentosDeCompra.fechaRecepcion })
      .from(documentosDeCompra)
      .where(inArray(documentosDeCompra.id, idsDelLibro));
    return new Map(filas.map(({ id, fechaRecepcion }) => [id, fechaRecepcion]));
  }
}
