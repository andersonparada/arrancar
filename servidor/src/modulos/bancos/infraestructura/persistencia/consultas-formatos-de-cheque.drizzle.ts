import { asc, eq, getTableColumns, sql } from 'drizzle-orm';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { FormatoDeChequeDto } from '../../aplicacion/dto/formato-de-cheque.dto.js';
import type { ConsultasFormatosDeCheque } from '../../aplicacion/puertos/consultas-formatos-de-cheque.js';
import { chequeras } from './chequeras.tablas.js';
import { mapeadorDeFormatoDeCheque } from './formato-de-cheque.mapeador.js';
import { formatosDeCheque } from './formatos-de-cheque.tablas.js';

/** Las chequeras que lo usan se cuentan con la seguridad por empresa (RLS) de la empresa activa. */
const columnas = {
  ...getTableColumns(formatosDeCheque),
  chequerasQueLoUsan: sql<number>`count(${chequeras.id})::int`,
};

export class ConsultasFormatosDeChequeDrizzle implements ConsultasFormatosDeCheque {
  async listar(): Promise<FormatoDeChequeDto[]> {
    const filas = await this.consulta().orderBy(asc(formatosDeCheque.nombre));
    return filas.map(mapeadorDeFormatoDeCheque.aDto);
  }

  async obtener(formatoId: string): Promise<FormatoDeChequeDto> {
    const [fila] = await this.consulta().where(eq(formatosDeCheque.id, formatoId));
    if (!fila) throw new RecursoNoEncontrado('El formato de cheque');
    return mapeadorDeFormatoDeCheque.aDto(fila);
  }

  private consulta() {
    return transaccionEnCurso()
      .select(columnas)
      .from(formatosDeCheque)
      .leftJoin(chequeras, eq(chequeras.formatoDeChequeId, formatosDeCheque.id))
      .groupBy(formatosDeCheque.id);
  }
}
