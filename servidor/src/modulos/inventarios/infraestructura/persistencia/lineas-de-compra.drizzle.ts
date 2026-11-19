import { eq, inArray, sql } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { documentos } from '../../../libro-de-compras/infraestructura/persistencia/documentos.tablas.js';
import { lineasDeDocumento } from '../../../libro-de-compras/infraestructura/persistencia/lineas-de-documento.tablas.js';
import type { LineasDeCompra } from '../../aplicacion/puertos/lineas-de-compra.js';
import { aCentavosEnteros } from '../../dominio/decimales.js';
import type { LineaDeCompra } from '../../dominio/linea-de-compra.js';
import { aplicadoSql, costoDeLineaSql, descartadaSql } from './sql-de-lineas-de-compra.js';

const columnas = {
  lineaId: lineasDeDocumento.id,
  documentoId: lineasDeDocumento.documentoId,
  numeroDeLinea: lineasDeDocumento.numero,
  tipoDeDocumento: documentos.tipo,
  estado: documentos.estado,
  documentoAfectadoId: documentos.documentoAfectadoId,
  serie: documentos.serie,
  numero: documentos.numero,
  fechaEmision: documentos.fechaEmision,
  esInventario: lineasDeDocumento.esInventario,
  costo: costoDeLineaSql,
  aplicado: aplicadoSql,
  descartada: descartadaSql,
};

/** Lee las líneas del libro de la empresa activa (la seguridad por empresa limita lo que se ve). */
export class LineasDeCompraDrizzle implements LineasDeCompra {
  async bloquear(lineaIds: readonly string[]): Promise<void> {
    for (const id of [...new Set(lineaIds)].sort()) {
      await transaccionEnCurso().execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`inventarios.linea:${id}`}, 0))`,
      );
    }
  }

  async buscar(lineaIds: readonly string[]): Promise<LineaDeCompra[]> {
    if (lineaIds.length === 0) return [];
    await this.bloquearDocumentos(lineaIds);
    const filas = await transaccionEnCurso()
      .select(columnas)
      .from(lineasDeDocumento)
      .innerJoin(documentos, eq(documentos.id, lineasDeDocumento.documentoId))
      .where(inArray(lineasDeDocumento.id, [...lineaIds]));
    return filas.map(({ costo, aplicado, estado, serie, numero, ...fila }) => ({
      ...fila,
      documentoVigente: estado === 'vigente',
      documento: serie ? `${serie}-${numero}` : numero,
      costoCentavos: aCentavosEnteros(costo),
      aplicadoCentavos: aCentavosEnteros(aplicado),
    }));
  }

  /**
   * Toma FOR SHARE de los documentos de las líneas, en orden, antes de leerlos: anular el documento (FOR UPDATE) espera
   * a esta operación y ve sus movimientos, o esta lee el documento ya anulado.
   */
  private async bloquearDocumentos(lineaIds: readonly string[]): Promise<void> {
    const deLasLineas = transaccionEnCurso()
      .select({ id: lineasDeDocumento.documentoId })
      .from(lineasDeDocumento)
      .where(inArray(lineasDeDocumento.id, [...lineaIds]));
    await transaccionEnCurso()
      .select({ id: documentos.id })
      .from(documentos)
      .where(inArray(documentos.id, deLasLineas))
      .orderBy(documentos.id)
      .for('share');
  }
}
