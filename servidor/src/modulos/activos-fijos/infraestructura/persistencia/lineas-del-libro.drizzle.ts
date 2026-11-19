import { eq, inArray } from 'drizzle-orm';
import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { documentos } from '../../../libro-de-compras/infraestructura/persistencia/documentos.tablas.js';
import { lineasDeDocumento } from '../../../libro-de-compras/infraestructura/persistencia/lineas-de-documento.tablas.js';
import type { LineaConReferencia, LineasDelLibro } from '../../aplicacion/puertos/lineas-del-libro.js';
import { capitalizadoSql, costoDeLineaSql, descartadaSql, facturaCapitalizadaSql } from './sql-de-lineas.js';

const columnas = {
  lineaId: lineasDeDocumento.id,
  documentoId: lineasDeDocumento.documentoId,
  numeroDeLinea: lineasDeDocumento.numero,
  tipoDeDocumento: documentos.tipo,
  estado: documentos.estado,
  serie: documentos.serie,
  numero: documentos.numero,
  fechaEmision: documentos.fechaEmision,
  esActivoFijo: lineasDeDocumento.esActivoFijo,
  costo: costoDeLineaSql,
  capitalizado: capitalizadoSql,
  descartada: descartadaSql,
  facturaCapitalizada: facturaCapitalizadaSql,
};

/** Lee las líneas del libro de la empresa activa (la seguridad por empresa limita lo que se ve). */
export class LineasDelLibroDrizzle implements LineasDelLibro {
  async buscar(lineaIds: readonly string[]): Promise<LineaConReferencia[]> {
    if (lineaIds.length === 0) return [];
    const filas = await transaccionEnCurso()
      .select(columnas)
      .from(lineasDeDocumento)
      .innerJoin(documentos, eq(documentos.id, lineasDeDocumento.documentoId))
      .where(inArray(lineasDeDocumento.id, [...lineaIds]));
    return filas.map(({ costo, capitalizado, estado, serie, numero, ...fila }) => ({
      ...fila,
      documentoVigente: estado === 'vigente',
      documento: serie ? `${serie}-${numero}` : numero,
      costoCentavos: aCentavos(costo),
      capitalizadoCentavos: aCentavos(capitalizado),
    }));
  }
}
