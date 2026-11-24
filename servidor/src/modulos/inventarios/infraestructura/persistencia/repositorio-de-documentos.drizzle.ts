import { and, eq, sql } from 'drizzle-orm';
import { deLaTransaccion } from '../../../core/base-datos/columnas.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  AnulacionDeDocumento,
  CambioDeTraslado,
  DocumentoGuardado,
  RepositorioDeDocumentos,
} from '../../aplicacion/puertos/repositorio-de-documentos.js';
import { documentos } from './documentos.tablas.js';

type Fila = typeof documentos.$inferSelect;

function aDocumento(fila: Fila): DocumentoGuardado {
  return {
    id: fila.id,
    clase: fila.clase,
    numero: fila.numero,
    fecha: fila.fecha,
    bodegaId: fila.bodegaId,
    documentoDeCompraId: fila.documentoDeCompraId,
    documentoRelacionadoId: fila.documentoRelacionadoId,
    bodegaDeDestinoId: fila.bodegaDeDestinoId,
    estadoDeTraslado: fila.estadoDeTraslado,
    causa: fila.causa,
    destino: fila.destino,
    conceptoDeGastoId: fila.conceptoDeGastoId,
    localidadId: fila.localidadId,
    departamentoId: fila.departamentoId,
    activoFijoId: fila.activoFijoId,
    entregadoA: fila.entregadoA,
    soporte: fila.soporte,
    observaciones: fila.observaciones,
    requiereFactura: fila.requiereFactura,
    estado: fila.estado,
  };
}

/**
 * La tabla tiene seguridad por empresa y por bodega (RLS): `buscar` no encuentra los documentos de una bodega que el
 * usuario no ve, y ninguna consulta filtra por empresa.
 */
export class RepositorioDeDocumentosDrizzle implements RepositorioDeDocumentos {
  async agregar(documento: DocumentoGuardado): Promise<void> {
    await transaccionEnCurso()
      .insert(documentos)
      .values({ ...documento, empresaId: deLaTransaccion.empresa() });
  }

  async buscar(id: string): Promise<DocumentoGuardado | null> {
    const [fila] = await transaccionEnCurso().select().from(documentos).where(eq(documentos.id, id));
    return fila ? aDocumento(fila) : null;
  }

  async buscarSaldoInicialDeBodega(bodegaId: string): Promise<DocumentoGuardado | null> {
    const [fila] = await transaccionEnCurso()
      .select()
      .from(documentos)
      .where(
        and(eq(documentos.clase, 'saldo_inicial'), eq(documentos.bodegaId, bodegaId), eq(documentos.estado, 'vigente')),
      );
    return fila ? aDocumento(fila) : null;
  }

  async bloquearSaldosInicialesDeBodegas(bodegaIds: readonly string[]): Promise<void> {
    for (const id of [...new Set(bodegaIds)].sort()) {
      await transaccionEnCurso().execute(
        sql`select pg_advisory_xact_lock(hashtextextended('inventarios.saldo_inicial:' || current_setting('app.empresa_id', true) || ':' || ${id}::text, 0))`,
      );
    }
  }

  async anular(id: string, { motivo, usuarioId, ahora }: AnulacionDeDocumento): Promise<void> {
    await transaccionEnCurso()
      .update(documentos)
      .set({ estado: 'anulado', anuladoEn: ahora, anuladoPor: usuarioId, motivoDeAnulacion: motivo })
      .where(eq(documentos.id, id));
  }

  async cambiarTraslado(id: string, cambio: CambioDeTraslado): Promise<void> {
    await transaccionEnCurso().update(documentos).set(cambio).where(eq(documentos.id, id));
  }
}
