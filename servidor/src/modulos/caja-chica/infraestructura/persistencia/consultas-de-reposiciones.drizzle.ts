import { asc, desc, eq, inArray } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  ComprobantesParaReponer,
  ConsultasDeReposiciones,
} from '../../aplicacion/puertos/puertos-de-reposiciones.js';
import type { Comprobante } from '../../dominio/comprobantes.js';
import type { Reposicion } from '../../dominio/reposiciones.js';
import { aComprobante, comprobantesConSuContexto } from './comprobantes.lectura.js';
import { comprobantes } from './comprobantes.tablas.js';
import { ConsultasDeComprobantesDrizzle } from './consultas-de-comprobantes.drizzle.js';
import { reposicionComprobantes } from './reposicion-comprobantes.tablas.js';
import { aReposicion } from './repositorio-de-reposiciones.drizzle.js';
import { reposiciones } from './reposiciones.tablas.js';

/** Lecturas de las reposiciones y de los comprobantes que cubren; las tablas tienen RLS por empresa y alcance. */
export class ConsultasDeReposicionesDrizzle implements ConsultasDeReposiciones {
  async delFondo(fondoId: string): Promise<Reposicion[]> {
    const filas = await transaccionEnCurso()
      .select()
      .from(reposiciones)
      .where(eq(reposiciones.fondoId, fondoId))
      .orderBy(desc(reposiciones.fecha), desc(reposiciones.numero));
    return filas.map(aReposicion);
  }

  async comprobantesDe(reposicionId: string): Promise<Comprobante[]> {
    const lineas = await transaccionEnCurso()
      .select({ comprobanteId: reposicionComprobantes.comprobanteId })
      .from(reposicionComprobantes)
      .where(eq(reposicionComprobantes.reposicionId, reposicionId));
    if (lineas.length === 0) return [];
    const filas = await comprobantesConSuContexto()
      .where(
        inArray(
          comprobantes.id,
          lineas.map(({ comprobanteId }) => comprobanteId),
        ),
      )
      .orderBy(asc(comprobantes.fecha), asc(comprobantes.creadoEn));
    return filas.map(aComprobante);
  }

  pendientesDelFondo(fondoId: string): Promise<Comprobante[]> {
    return new ConsultasDeComprobantesDrizzle().delFondo({ fondoId, estado: 'pendiente' });
  }
}

/** Bloquea los comprobantes por id (siempre en el mismo orden) y los lee con su documento y su reposición. */
export class ComprobantesParaReponerDrizzle implements ComprobantesParaReponer {
  async bloquear(ids: readonly string[]): Promise<Comprobante[]> {
    if (ids.length === 0) return [];
    const unicos = [...new Set(ids)];
    const bloqueados = await transaccionEnCurso()
      .select({ id: comprobantes.id })
      .from(comprobantes)
      .where(inArray(comprobantes.id, unicos))
      .orderBy(asc(comprobantes.id))
      .for('update');
    if (bloqueados.length === 0) return [];
    const filas = await comprobantesConSuContexto().where(
      inArray(
        comprobantes.id,
        bloqueados.map(({ id }) => id),
      ),
    );
    return filas.map(aComprobante);
  }
}
