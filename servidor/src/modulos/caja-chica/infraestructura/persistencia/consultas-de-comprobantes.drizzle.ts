import { and, asc, eq, gte, isNotNull, isNull, lte, type SQL } from 'drizzle-orm';
import type {
  ConsultasDeComprobantes,
  FiltroDeBandeja,
  FiltroDeComprobantes,
} from '../../aplicacion/puertos/puertos-de-comprobantes.js';
import type { Comprobante } from '../../dominio/comprobantes.js';
import { aComprobante, comprobantesConSuContexto } from './comprobantes.lectura.js';
import { comprobantes } from './comprobantes.tablas.js';
import { reposiciones } from './reposiciones.tablas.js';

/** Lo que cada estado pide: pendiente = vigente sin reposición; repuesto = vigente con ella. */
function condicionDelEstado(estado: FiltroDeComprobantes['estado']): SQL | undefined {
  if (estado === 'anulado') return eq(comprobantes.estado, 'anulado');
  if (estado === 'todos') return undefined;
  const vigente = eq(comprobantes.estado, 'vigente');
  return and(vigente, estado === 'repuesto' ? isNotNull(reposiciones.numero) : isNull(reposiciones.numero));
}

/** Lecturas de los comprobantes; la bandeja y cada fondo salen de la misma consulta con su documento y su reposición. */
export class ConsultasDeComprobantesDrizzle implements ConsultasDeComprobantes {
  async bandeja(filtro: FiltroDeBandeja): Promise<Comprobante[]> {
    const condiciones = [
      isNull(comprobantes.fondoId),
      eq(comprobantes.estado, 'vigente'),
      eq(comprobantes.clase, 'documento'),
      filtro.proveedorId ? eq(comprobantes.proveedorId, filtro.proveedorId) : undefined,
      filtro.desde ? gte(comprobantes.fecha, filtro.desde) : undefined,
      filtro.hasta ? lte(comprobantes.fecha, filtro.hasta) : undefined,
      filtro.conRetencion === undefined ? undefined : eq(comprobantes.conRetencion, filtro.conRetencion),
    ];
    const filas = await comprobantesConSuContexto()
      .where(and(...condiciones))
      .orderBy(asc(comprobantes.fecha), asc(comprobantes.creadoEn));
    return filas.map(aComprobante);
  }

  async delFondo({ fondoId, estado }: FiltroDeComprobantes): Promise<Comprobante[]> {
    const filas = await comprobantesConSuContexto()
      .where(and(eq(comprobantes.fondoId, fondoId), condicionDelEstado(estado)))
      .orderBy(asc(comprobantes.fecha), asc(comprobantes.creadoEn));
    return filas.map(aComprobante);
  }
}
