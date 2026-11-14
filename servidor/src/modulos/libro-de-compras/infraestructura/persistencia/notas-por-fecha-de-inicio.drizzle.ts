import { and, eq, gte, lt, sql, type SQL } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { NotasPorFechaDeInicio } from '../../aplicacion/puertos/puertos-de-fecha-de-inicio.js';
import type { NotasQueEstorban } from '../../dominio/errores-de-factura-anterior.js';
import { documentos } from './documentos.tablas.js';
import { facturasAnteriores } from './facturas-anteriores.tablas.js';

const MAXIMO_EN_EL_ERROR = 5;

/** Las tablas tienen seguridad por empresa (RLS): solo cuentan las de la empresa de la transacción. */
export class NotasPorFechaDeInicioDrizzle implements NotasPorFechaDeInicio {
  conFacturaEmitidaDesde(fecha: string): Promise<NotasQueEstorban> {
    return this.notasVigentesDe(gte(facturasAnteriores.fechaEmision, fecha));
  }

  recibidasAntesDe(fecha: string): Promise<NotasQueEstorban> {
    return this.notasVigentesDe(lt(documentos.fechaRecepcion, fecha));
  }

  private async notasVigentesDe(condicion: SQL): Promise<NotasQueEstorban> {
    const filas = await transaccionEnCurso()
      .select({
        id: documentos.id,
        serie: documentos.serie,
        numero: documentos.numero,
        cantidad: sql<number>`(count(*) over ())::int`,
      })
      .from(documentos)
      .innerJoin(facturasAnteriores, eq(facturasAnteriores.id, documentos.facturaAnteriorId))
      .where(and(eq(documentos.estado, 'vigente'), condicion))
      .orderBy(documentos.fechaRecepcion, documentos.numero)
      .limit(MAXIMO_EN_EL_ERROR);
    return {
      cantidad: filas[0]?.cantidad ?? 0,
      muestra: filas.map(({ id, serie, numero }) => ({ id, serie, numero })),
    };
  }
}
