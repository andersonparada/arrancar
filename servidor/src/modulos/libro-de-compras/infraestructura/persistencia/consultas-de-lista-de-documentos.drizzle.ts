import { and, count, desc, eq, inArray, sql, sum, type SQL } from 'drizzle-orm';
import { aCentavos, deCentavos } from '../../../core/compartido/dominio/centavos.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  DocumentoListadoDto,
  FiltroDeDocumentos,
  PaginaDeDocumentosDto,
  PaginacionDeDocumentos,
} from '../../aplicacion/dto/documento-listado.dto.js';
import type { ConsultasDeListaDeDocumentos } from '../../aplicacion/puertos/puertos-de-baja-de-documentos.js';
import { accionesDeDocumento } from '../../dominio/baja-de-documento.js';
import { documentos } from './documentos.tablas.js';
import { retenciones } from './retenciones.tablas.js';

type FilaDeDocumento = typeof documentos.$inferSelect;

interface NotasDeUnaFactura {
  vigentes: number;
  enTotal: number;
}

/** El mes del libro de cualquier fecha: su primer día. */
const primerDiaDelMes = (fecha: string): string => `${fecha.slice(0, 7)}-01`;

function condiciones(filtro: FiltroDeDocumentos): SQL | undefined {
  return and(
    filtro.periodo ? eq(documentos.periodo, primerDiaDelMes(filtro.periodo)) : undefined,
    filtro.proveedorId ? eq(documentos.proveedorId, filtro.proveedorId) : undefined,
    filtro.estado && filtro.estado !== 'todos' ? eq(documentos.estado, filtro.estado) : undefined,
    filtro.destino ? eq(documentos.destino, filtro.destino) : undefined,
    filtro.tipo ? eq(documentos.tipo, filtro.tipo) : undefined,
  );
}

const accionesDeLaFila = (fila: FilaDeDocumento, notas: NotasDeUnaFactura) =>
  accionesDeDocumento({
    anulado: fila.estado === 'anulado',
    procesadoEnElDestino: fila.procesadoEnDestinoEn !== null,
    notasVigentes: notas.vigentes,
    notasEnTotal: notas.enTotal,
  });

function filaDeLista(fila: FilaDeDocumento, notas: NotasDeUnaFactura, retenido: number): DocumentoListadoDto {
  const total = aCentavos(fila.total);
  return {
    id: fila.id,
    tipo: fila.tipo,
    proveedorId: fila.proveedorId,
    nombreEmisor: fila.nombreEmisor,
    serie: fila.serie,
    numero: fila.numero,
    fechaEmision: fila.fechaEmision,
    fechaRecepcion: fila.fechaRecepcion,
    periodo: fila.periodo,
    destino: fila.destino,
    estado: fila.estado,
    muestraEnReportesSat: fila.muestraEnReportesSat,
    documentoAfectadoId: fila.documentoAfectadoId,
    total: deCentavos(total),
    retenido: deCentavos(retenido),
    netoAPagar: deCentavos(total - retenido),
    procesado: fila.procesadoEnDestinoEn !== null,
    ...accionesDeLaFila(fila, notas),
  };
}

/** La tabla tiene seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class ConsultasDeListaDeDocumentosDrizzle implements ConsultasDeListaDeDocumentos {
  async listar(filtro: FiltroDeDocumentos, { pagina, limite }: PaginacionDeDocumentos): Promise<PaginaDeDocumentosDto> {
    const donde = condiciones(filtro);
    const [cuenta] = await transaccionEnCurso().select({ total: count() }).from(documentos).where(donde);
    const filas = await transaccionEnCurso()
      .select()
      .from(documentos)
      .where(donde)
      .orderBy(desc(documentos.periodo), desc(documentos.fechaEmision), desc(documentos.creadoEn))
      .limit(limite)
      .offset((pagina - 1) * limite);
    const ids = filas.map((fila) => fila.id);
    const notas = await this.notasDeLasFacturas(ids);
    const retenidos = await this.retenidoPorDocumento(ids);
    const elementos = filas.map((fila) =>
      filaDeLista(fila, notas.get(fila.id) ?? { vigentes: 0, enTotal: 0 }, retenidos.get(fila.id) ?? 0),
    );
    return { elementos, total: cuenta?.total ?? 0, pagina, limite };
  }

  /** Cuántas notas de crédito, vigentes y en total, rebajan a cada documento de la página. */
  private async notasDeLasFacturas(ids: string[]): Promise<Map<string, NotasDeUnaFactura>> {
    const resultado = new Map<string, NotasDeUnaFactura>();
    if (ids.length === 0) return resultado;
    const filas = await transaccionEnCurso()
      .select({
        facturaId: documentos.documentoAfectadoId,
        enTotal: count(),
        vigentes: sql<number>`count(*) filter (where ${documentos.estado} = 'vigente')`.mapWith(Number),
      })
      .from(documentos)
      .where(inArray(documentos.documentoAfectadoId, ids))
      .groupBy(documentos.documentoAfectadoId);
    for (const fila of filas) {
      if (fila.facturaId) resultado.set(fila.facturaId, { vigentes: fila.vigentes, enTotal: fila.enTotal });
    }
    return resultado;
  }

  /** Lo retenido a cada documento de la página, en centavos. */
  private async retenidoPorDocumento(ids: string[]): Promise<Map<string, number>> {
    const resultado = new Map<string, number>();
    if (ids.length === 0) return resultado;
    const filas = await transaccionEnCurso()
      .select({ documentoId: retenciones.documentoId, retenido: sum(retenciones.monto) })
      .from(retenciones)
      .where(inArray(retenciones.documentoId, ids))
      .groupBy(retenciones.documentoId);
    for (const fila of filas) resultado.set(fila.documentoId, aCentavos(fila.retenido ?? '0'));
    return resultado;
  }
}
