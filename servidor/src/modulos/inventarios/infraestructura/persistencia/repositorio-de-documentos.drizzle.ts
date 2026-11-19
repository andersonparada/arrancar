import { eq } from 'drizzle-orm';
import { deLaTransaccion } from '../../../core/base-datos/columnas.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  AnulacionDeDocumento,
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
    bodegaId: fila.bodegaId!,
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

  async anular(id: string, { motivo, usuarioId, ahora }: AnulacionDeDocumento): Promise<void> {
    await transaccionEnCurso()
      .update(documentos)
      .set({ estado: 'anulado', anuladoEn: ahora, anuladoPor: usuarioId, motivoDeAnulacion: motivo })
      .where(eq(documentos.id, id));
  }
}
