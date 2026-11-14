import { asc, eq, sql } from 'drizzle-orm';
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  AnulacionDeDocumento,
  DocumentoGuardado,
  RepositorioDeDocumentosGuardados,
} from '../../aplicacion/puertos/puertos-de-baja-de-documentos.js';
import type { MotivoSinCredito } from '../../dominio/tipos-de-documento.js';
import { mapeadorDeDocumentoGuardado, type FacturaDelLibroDeLaNota } from './documento-guardado.mapeador.js';
import type { FacturaAnterior } from '../../dominio/factura-anterior.js';
import { mapeadorDeFacturaAnterior } from './factura-anterior.mapeador.js';
import { facturasAnteriores } from './facturas-anteriores.tablas.js';
import { documentos } from './documentos.tablas.js';
import { lineasDeDocumento } from './lineas-de-documento.tablas.js';
import { retenciones } from './retenciones.tablas.js';

/** La tabla tiene seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RepositorioDeDocumentosGuardadosDrizzle implements RepositorioDeDocumentosGuardados {
  async buscar(id: string, bloquear: boolean): Promise<DocumentoGuardado | null> {
    const transaccion = transaccionEnCurso();
    const consulta = transaccion.select().from(documentos).where(eq(documentos.id, id));
    const [documento] = await (bloquear ? consulta.for('update') : consulta);
    if (!documento) return null;
    const lineas = await transaccion.select().from(lineasDeDocumento).where(eq(lineasDeDocumento.documentoId, id));
    const retenidas = await transaccion.select().from(retenciones).where(eq(retenciones.documentoId, id));
    const notas = await transaccion
      .select()
      .from(documentos)
      .where(eq(documentos.documentoAfectadoId, id))
      .orderBy(asc(documentos.fechaEmision), asc(documentos.creadoEn));
    return mapeadorDeDocumentoGuardado.aDominio({
      documento,
      lineas,
      retenciones: retenidas,
      notas,
      facturaDelLibro: await this.facturaDelLibro(documento.documentoAfectadoId),
      facturaAnterior: await this.facturaAnterior(documento.facturaAnteriorId),
      anuladoPorNombre: await this.nombreDeQuienAnulo(documento.anuladoPor),
    });
  }

  /** La factura del sistema anterior que cita una nota; `null` si no cita ninguna. */
  private async facturaAnterior(id: string | null): Promise<FacturaAnterior | null> {
    if (id === null) return null;
    const [fila] = await transaccionEnCurso().select().from(facturasAnteriores).where(eq(facturasAnteriores.id, id));
    return fila ? mapeadorDeFacturaAnterior.aDominio(fila) : null;
  }

  /** Nombre y apellidos de quien anuló; `null` si no hubo anulación o el usuario no se puede leer. */
  private async nombreDeQuienAnulo(usuarioId: string | null): Promise<string | null> {
    if (usuarioId === null) return null;
    const [usuario] = await transaccionEnCurso()
      .select({ nombres: usuarios.nombres, apellidos: usuarios.apellidos })
      .from(usuarios)
      .where(eq(usuarios.id, usuarioId));
    return usuario ? `${usuario.nombres} ${usuario.apellidos ?? ''}`.trim() : null;
  }

  /** La factura del libro que corrige una nota; `null` si el documento no cita ninguna. */
  private async facturaDelLibro(facturaId: string | null): Promise<FacturaDelLibroDeLaNota | null> {
    if (facturaId === null) return null;
    const [factura] = await transaccionEnCurso().select().from(documentos).where(eq(documentos.id, facturaId));
    if (!factura) return null;
    return {
      id: factura.id,
      tipo: factura.tipo,
      serie: factura.serie,
      numero: factura.numero,
      fechaEmision: factura.fechaEmision,
      motivoSinCredito: factura.motivoSinCredito as MotivoSinCredito | null,
    };
  }

  async anular(id: string, { anuladoPor, motivo, causa }: AnulacionDeDocumento): Promise<void> {
    await transaccionEnCurso()
      .update(documentos)
      .set({ estado: 'anulado', anuladoEn: sql`now()`, anuladoPor, motivoDeAnulacion: motivo, causaDeAnulacion: causa })
      .where(eq(documentos.id, id));
  }

  async eliminar(id: string): Promise<void> {
    await transaccionEnCurso().delete(documentos).where(eq(documentos.id, id));
  }

  async marcarProcesado(id: string, procesado: boolean): Promise<void> {
    await transaccionEnCurso()
      .update(documentos)
      .set({ procesadoEnDestinoEn: procesado ? sql`now()` : null })
      .where(eq(documentos.id, id));
  }
}
