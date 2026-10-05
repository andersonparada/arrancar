import { and, desc, eq, sql } from 'drizzle-orm';
import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { ConsultasDeDocumentos, FacturaParaNota } from '../../aplicacion/puertos/puertos-de-documentos.js';
import type { DestinoDeDocumento } from '../../dominio/destinos-de-documento.js';
import type { MotivoSinCredito } from '../../dominio/tipos-de-documento.js';
import { documentos } from './documentos.tablas.js';

/** La tabla tiene seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class ConsultasDeDocumentosDrizzle implements ConsultasDeDocumentos {
  async buscarFacturaParaNota(id: string, bloquear: boolean): Promise<FacturaParaNota | null> {
    const consulta = transaccionEnCurso().select().from(documentos).where(eq(documentos.id, id));
    const [factura] = await (bloquear ? consulta.for('update') : consulta);
    if (!factura) return null;
    const notas = await this.sumaDeNotasVigentes(id);
    return {
      id: factura.id,
      tipo: factura.tipo,
      estado: factura.estado,
      proveedorId: factura.proveedorId,
      destino: factura.destino,
      motivoSinCredito: factura.motivoSinCredito as MotivoSinCredito | null,
      fechaEmision: factura.fechaEmision,
      total: aCentavos(factura.total),
      iva: aCentavos(factura.iva),
      totalDeNotas: notas.total,
      ivaDeNotas: notas.iva,
    };
  }

  async ultimoDestinoDelProveedor(proveedorId: string): Promise<DestinoDeDocumento | null> {
    const [fila] = await transaccionEnCurso()
      .select({ destino: documentos.destino })
      .from(documentos)
      .where(eq(documentos.proveedorId, proveedorId))
      .orderBy(desc(documentos.creadoEn))
      .limit(1);
    return fila?.destino ?? null;
  }

  /** Lo que ya rebajaron las notas de crédito vigentes de la factura, en centavos. */
  private async sumaDeNotasVigentes(facturaId: string): Promise<{ total: number; iva: number }> {
    const [suma] = await transaccionEnCurso()
      .select({
        total: sql<string>`coalesce(sum(${documentos.total}), 0)`,
        iva: sql<string>`coalesce(sum(${documentos.iva}), 0)`,
      })
      .from(documentos)
      .where(
        and(
          eq(documentos.documentoAfectadoId, facturaId),
          eq(documentos.tipo, 'nota_de_credito'),
          eq(documentos.estado, 'vigente'),
        ),
      );
    return { total: aCentavos(suma?.total ?? '0'), iva: aCentavos(suma?.iva ?? '0') };
  }
}
