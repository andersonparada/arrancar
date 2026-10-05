import { and, desc, eq, gt, or, sql, type SQL } from 'drizzle-orm';
import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  ClaveDeDocumento,
  ConsultasDeDocumentos,
  FacturaParaNota,
} from '../../aplicacion/puertos/puertos-de-documentos.js';
import type { DestinoDeDocumento } from '../../dominio/destinos-de-documento.js';
import type { DocumentoAnuladoConRetenciones } from '../../dominio/retencion-practicada.js';
import type { ReglaDeRetencion } from '../../dominio/retencion-propuesta.js';
import type { MotivoSinCredito } from '../../dominio/tipos-de-documento.js';
import { documentos } from './documentos.tablas.js';
import { retenciones } from './retenciones.tablas.js';

/** La misma autorización FEL, o el mismo NIT del emisor, tipo, serie y número; sin ninguna de las dos claves, nada. */
function mismaIdentidad(clave: ClaveDeDocumento): SQL | undefined {
  const deLaFel = clave.autorizacionFel ? eq(documentos.autorizacionFel, clave.autorizacionFel) : undefined;
  const delSat =
    clave.nitEmisor && clave.serie
      ? and(
          eq(documentos.nitEmisor, clave.nitEmisor),
          eq(documentos.tipo, clave.tipo),
          eq(documentos.serie, clave.serie),
          eq(documentos.numero, clave.numero),
        )
      : undefined;
  return or(deLaFel, delSat);
}

interface FilaDeRetencionAnulada {
  documentoId: string;
  serie: string | null;
  numero: string;
  impuesto: 'iva' | 'isr';
  regla: string;
  monto: string;
}

/** Con las filas ordenadas del anulado más reciente al más antiguo, el primer documento con sus retenciones. */
function delMasReciente(filas: FilaDeRetencionAnulada[]): DocumentoAnuladoConRetenciones | null {
  const primero = filas[0];
  if (!primero) return null;
  return {
    serie: primero.serie,
    numero: primero.numero,
    retenciones: filas
      .filter((fila) => fila.documentoId === primero.documentoId)
      .map((fila) => ({
        impuesto: fila.impuesto,
        regla: fila.regla as ReglaDeRetencion,
        monto: aCentavos(fila.monto),
      })),
  };
}

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

  async buscarAnuladoConRetenciones(clave: ClaveDeDocumento): Promise<DocumentoAnuladoConRetenciones | null> {
    const identidad = mismaIdentidad(clave);
    if (!identidad) return null;
    const filas = await transaccionEnCurso()
      .select({
        documentoId: documentos.id,
        serie: documentos.serie,
        numero: documentos.numero,
        impuesto: retenciones.impuesto,
        regla: retenciones.regla,
        monto: retenciones.monto,
      })
      .from(documentos)
      .innerJoin(retenciones, eq(retenciones.documentoId, documentos.id))
      .where(and(eq(documentos.estado, 'anulado'), gt(retenciones.monto, '0'), identidad))
      .orderBy(desc(documentos.anuladoEn));
    return delMasReciente(filas);
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
