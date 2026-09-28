import { and, asc, eq, getTableColumns } from 'drizzle-orm';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { ChequeDto } from '../../aplicacion/dto/cheque.dto.js';
import type { ConsultasCheques } from '../../aplicacion/puertos/consultas-cheques.js';
import { mapeadorDeCheque } from './cheque.mapeador.js';
import { cheques } from './cheques.tablas.js';
import { chequeras } from './chequeras.tablas.js';

const columnas = getTableColumns(cheques);

export class ConsultasChequesDrizzle implements ConsultasCheques {
  async listarDeLaChequera(chequeraId: string, estado?: 'disponible' | 'emitido' | 'anulado'): Promise<ChequeDto[]> {
    const filas = await transaccionEnCurso()
      .select(columnas)
      .from(cheques)
      .where(and(eq(cheques.chequeraId, chequeraId), estado ? eq(cheques.estado, estado) : undefined))
      .orderBy(asc(cheques.numero));
    return filas.map(mapeadorDeCheque.aDto);
  }

  async obtener(chequeId: string): Promise<ChequeDto> {
    const [fila] = await transaccionEnCurso().select(columnas).from(cheques).where(eq(cheques.id, chequeId));
    if (!fila) throw new RecursoNoEncontrado('El cheque');
    return mapeadorDeCheque.aDto(fila);
  }

  /** El menor disponible por serie y número entre las chequeras activas de la cuenta. */
  async siguienteDisponible(cuentaBancariaId: string): Promise<ChequeDto | null> {
    const [fila] = await transaccionEnCurso()
      .select(columnas)
      .from(cheques)
      .innerJoin(chequeras, eq(chequeras.id, cheques.chequeraId))
      .where(
        and(
          eq(chequeras.cuentaBancariaId, cuentaBancariaId),
          eq(chequeras.activa, true),
          eq(cheques.estado, 'disponible'),
        ),
      )
      .orderBy(asc(chequeras.serie), asc(cheques.numero))
      .limit(1);
    return fila ? mapeadorDeCheque.aDto(fila) : null;
  }
}
