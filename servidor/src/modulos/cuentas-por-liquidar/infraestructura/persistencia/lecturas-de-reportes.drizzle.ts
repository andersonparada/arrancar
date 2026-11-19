import { and, asc, eq, gt, gte, lte } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { Anticipo } from '../../dominio/anticipos.js';
import type {
  ConsultasDeReportesDeAnticipos,
  FiltroDeNoLiquidado,
} from '../../aplicacion/puertos/puertos-de-reportes.js';
import { anticipos } from './anticipos.tablas.js';
import { aAnticipo } from './repositorio-de-anticipos.drizzle.js';

/** Cuántos anticipos trae una lectura de reporte: no se pagina. */
const TOPE = 10_000;

/** Lecturas de los reportes de anticipos con seguridad por empresa (RLS). */
export class LecturasDeReportesDeAnticiposDrizzle implements ConsultasDeReportesDeAnticipos {
  async noLiquidados({ desde, hasta, destino }: FiltroDeNoLiquidado): Promise<Anticipo[]> {
    const filas = await transaccionEnCurso()
      .select()
      .from(anticipos)
      .where(
        and(
          eq(anticipos.estado, 'liquidado'),
          gt(anticipos.noLiquidado, '0'),
          gte(anticipos.fechaDeLiquidacion, desde),
          lte(anticipos.fechaDeLiquidacion, hasta),
          destino ? eq(anticipos.destinoDeNoLiquidado, destino) : undefined,
        ),
      )
      .orderBy(asc(anticipos.fechaDeLiquidacion), asc(anticipos.anioDeNumero), asc(anticipos.numero))
      .limit(TOPE);
    return filas.map(aAnticipo);
  }
}
