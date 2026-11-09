import { and, count, eq, gte } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { SaldosInicialesPorFecha } from '../../aplicacion/puertos/puertos-de-fecha-de-inicio.js';
import { documentos } from './documentos.tablas.js';

/** La tabla tiene seguridad por empresa (RLS): solo cuenta los de la empresa del contexto. */
export class SaldosInicialesPorFechaDrizzle implements SaldosInicialesPorFecha {
  async contarEmitidosDesde(fecha: string): Promise<number> {
    const [fila] = await transaccionEnCurso()
      .select({ cantidad: count() })
      .from(documentos)
      .where(and(eq(documentos.origen, 'saldo_inicial'), gte(documentos.fechaEmision, fecha)));
    return fila?.cantidad ?? 0;
  }
}
