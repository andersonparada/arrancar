import { and, asc, count, eq, gt, gte, lt, or } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { ConsultasDelPeriodo, DocumentoCambiado } from '../../aplicacion/puertos/puertos-de-periodos.js';
import { sumarMeses } from '../../dominio/periodo-del-libro.js';
import { documentos } from './documentos.tablas.js';
import { dteRecibidos } from './dte-recibidos.tablas.js';
import { lotesDeDte } from './lotes-de-dte.tablas.js';

/** Meses anteriores al período cuyas facturas todavía pueden ir en él (art. 20 de la Ley del IVA). */
const MESES_ATRAS = 2;

/** Consultas de la revisión de un período; la seguridad por empresa (RLS) limita lo que se ve. */
export class ConsultasDelPeriodoDrizzle implements ConsultasDelPeriodo {
  async documentosCambiadosDesde(periodo: string, desde: Date): Promise<DocumentoCambiado[]> {
    const registrado = gt(documentos.creadoEn, desde);
    const anulado = gt(documentos.anuladoEn, desde);
    const filas = await transaccionEnCurso()
      .select({
        documentoId: documentos.id,
        tipoDte: documentos.tipoDte,
        serie: documentos.serie,
        numero: documentos.numero,
        total: documentos.total,
        creadoEn: documentos.creadoEn,
        anuladoEn: documentos.anuladoEn,
      })
      .from(documentos)
      .where(and(eq(documentos.periodo, periodo), eq(documentos.muestraEnReportesSat, true), or(registrado, anulado)))
      .orderBy(asc(documentos.fechaEmision), asc(documentos.numero));
    return filas
      .filter((fila) => !(fila.creadoEn > desde && fila.anuladoEn && fila.anuladoEn > desde))
      .map(({ creadoEn, anuladoEn: _anuladoEn, ...fila }) => ({
        ...fila,
        cambio: creadoEn > desde ? ('registrado' as const) : ('anulado' as const),
      }));
  }

  async dtePendientesQuePuedenIrEn(periodo: string): Promise<number | null> {
    const desde = sumarMeses(periodo, -MESES_ATRAS);
    const hasta = sumarMeses(periodo, 1);
    if (!(await this.hayLotesDeLaBandeja(desde, hasta))) return null;
    const [pendientes] = await transaccionEnCurso()
      .select({ cantidad: count() })
      .from(dteRecibidos)
      .where(
        and(
          eq(dteRecibidos.estado, 'pendiente'),
          eq(dteRecibidos.estadoSat, 'vigente'),
          gte(dteRecibidos.fechaEmision, desde),
          lt(dteRecibidos.fechaEmision, hasta),
        ),
      );
    return pendientes?.cantidad ?? 0;
  }

  /** Hay algún lote de la bandeja cuyas fechas de emisión caen entre `desde` (incluida) y `hasta` (excluida). */
  private async hayLotesDeLaBandeja(desde: string, hasta: string): Promise<boolean> {
    const [lotes] = await transaccionEnCurso()
      .select({ cantidad: count() })
      .from(lotesDeDte)
      .where(
        and(
          eq(lotesDeDte.proposito, 'bandeja'),
          gte(lotesDeDte.emisionHasta, desde),
          lt(lotesDeDte.emisionDesde, hasta),
        ),
      );
    return (lotes?.cantidad ?? 0) > 0;
  }
}
