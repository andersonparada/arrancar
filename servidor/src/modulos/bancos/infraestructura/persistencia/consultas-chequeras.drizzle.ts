import { desc, eq, getTableColumns, sql } from 'drizzle-orm';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { ChequeraDto } from '../../aplicacion/dto/chequera.dto.js';
import type { ConsultasChequeras } from '../../aplicacion/puertos/consultas-chequeras.js';
import { mapeadorDeChequera } from './chequera.mapeador.js';
import { chequeras } from './chequeras.tablas.js';
import { cheques } from './cheques.tablas.js';

const conteo = (estado: 'disponible' | 'emitido' | 'anulado') =>
  sql<number>`count(*) filter (where ${cheques.estado} = ${estado})::int`;

const columnas = {
  ...getTableColumns(chequeras),
  disponibles: conteo('disponible'),
  emitidos: conteo('emitido'),
  anulados: conteo('anulado'),
};

export class ConsultasChequerasDrizzle implements ConsultasChequeras {
  async listarDeLaCuenta(cuentaBancariaId: string): Promise<ChequeraDto[]> {
    const filas = await this.consulta()
      .where(eq(chequeras.cuentaBancariaId, cuentaBancariaId))
      .orderBy(desc(chequeras.creadoEn));
    return filas.map(mapeadorDeChequera.aDto);
  }

  async obtener(chequeraId: string): Promise<ChequeraDto> {
    const [fila] = await this.consulta().where(eq(chequeras.id, chequeraId));
    if (!fila) throw new RecursoNoEncontrado('La chequera');
    return mapeadorDeChequera.aDto(fila);
  }

  private consulta() {
    return transaccionEnCurso()
      .select(columnas)
      .from(chequeras)
      .leftJoin(cheques, eq(cheques.chequeraId, chequeras.id))
      .groupBy(chequeras.id);
  }
}
