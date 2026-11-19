import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { ConsultasDeRecepciones } from '../../aplicacion/puertos/consultas-de-recepciones.js';
import { aCentavosEnteros, aDiezmilesimas } from '../../dominio/decimales.js';
import type { EntradaDevolvible } from '../../dominio/devolucion.js';
import { NOMBRE_DE_CLASE } from '../../dominio/documento.js';
import type { EntradaParaRepartir } from '../../dominio/rebaja.js';
import { documentos } from './documentos.tablas.js';
import { movimientos } from './movimientos.tablas.js';

/** Lo que ya se le devolvió a la entrada: Σ de las salidas vigentes que la citan, en positivo. */
const devueltaSql = sql<string>`(select coalesce(-sum(devolucion.cantidad), 0) from ${movimientos} as devolucion
  where devolucion.movimiento_de_origen_id = ${movimientos.id} and devolucion.vigente and devolucion.tipo = 'salida')`;

const etiqueta = (clase: keyof typeof NOMBRE_DE_CLASE | null, numero: number | null): string =>
  clase && numero ? `${NOMBRE_DE_CLASE[clase]} ${numero}` : 'un documento de una bodega que no ve';

/** Los números de los documentos de una lista de movimientos, sin repetir; los de bodegas ajenas salen sin número. */
function etiquetasDe(filas: ReadonlyArray<{ clase: keyof typeof NOMBRE_DE_CLASE | null; numero: number | null }>) {
  return [...new Set(filas.map((fila) => etiqueta(fila.clase, fila.numero)))];
}

const columnasDeEntrada = {
  movimientoId: movimientos.id,
  articuloId: movimientos.articuloId,
  bodegaId: movimientos.bodegaId,
  loteId: movimientos.loteId,
  documentoId: movimientos.documentoId,
  documentoDeCompraId: movimientos.documentoDeCompraId,
  fecha: movimientos.fecha,
  cantidad: movimientos.cantidad,
  costoTotal: movimientos.costoTotal,
  devuelta: devueltaSql,
};

/** Las entradas de las recepciones y los documentos que dependen de ellas, para devoluciones, rebajas y avisos del libro. */
export class ConsultasDeRecepcionesDrizzle implements ConsultasDeRecepciones {
  async entradasDevolvibles(movimientoIds: readonly string[]): Promise<EntradaDevolvible[]> {
    if (movimientoIds.length === 0) return [];
    const filas = await transaccionEnCurso()
      .select(columnasDeEntrada)
      .from(movimientos)
      .innerJoin(documentos, eq(documentos.id, movimientos.documentoId))
      .where(
        and(
          inArray(movimientos.id, [...movimientoIds]),
          eq(movimientos.vigente, true),
          eq(movimientos.tipo, 'entrada'),
          eq(documentos.clase, 'recepcion_de_compra'),
        ),
      );
    return filas.map(({ cantidad, costoTotal, devuelta, bodegaId, documentoDeCompraId, ...fila }) => ({
      ...fila,
      costoCentavos: aCentavosEnteros(costoTotal),
      bodegaId: bodegaId!,
      documentoDeCompraId: documentoDeCompraId!,
      cantidad: aDiezmilesimas(cantidad),
      devuelta: aDiezmilesimas(devuelta),
    }));
  }

  /** Lee los movimientos sin pasar por los documentos: una rebaja no tiene bodega y reparte entre todas las entradas. */
  async entradasDeLaFactura(documentoDeCompraId: string): Promise<EntradaParaRepartir[]> {
    const filas = await transaccionEnCurso()
      .select({
        movimientoId: movimientos.id,
        articuloId: movimientos.articuloId,
        fecha: movimientos.fecha,
        cantidad: movimientos.cantidad,
        costoTotal: movimientos.costoTotal,
      })
      .from(movimientos)
      .where(
        and(
          eq(movimientos.documentoDeCompraId, documentoDeCompraId),
          eq(movimientos.vigente, true),
          eq(movimientos.tipo, 'entrada'),
        ),
      )
      .orderBy(asc(movimientos.fecha), asc(movimientos.secuencia));
    return filas.map((fila) => ({
      ...fila,
      cantidad: aDiezmilesimas(fila.cantidad),
      costoTotal: aCentavosEnteros(fila.costoTotal),
    }));
  }

  async documentosQueDependenDe(documentoId: string): Promise<string[]> {
    const origen = alias(movimientos, 'origen');
    const filas = await transaccionEnCurso()
      .selectDistinct({ clase: documentos.clase, numero: documentos.numero })
      .from(movimientos)
      .innerJoin(origen, eq(origen.id, movimientos.movimientoDeOrigenId))
      .leftJoin(documentos, eq(documentos.id, movimientos.documentoId))
      .where(and(eq(origen.documentoId, documentoId), eq(movimientos.vigente, true)));
    return etiquetasDe(filas);
  }

  async documentosDeLaCompra(documentoDeCompraId: string): Promise<string[]> {
    const filas = await transaccionEnCurso()
      .selectDistinct({ clase: documentos.clase, numero: documentos.numero })
      .from(movimientos)
      .leftJoin(documentos, eq(documentos.id, movimientos.documentoId))
      .where(and(eq(movimientos.documentoDeCompraId, documentoDeCompraId), eq(movimientos.vigente, true)));
    return etiquetasDe(filas);
  }
}
