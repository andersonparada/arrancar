import { asc, desc, eq, getTableColumns, sql } from 'drizzle-orm';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { ChequeraDto, FiltroDeChequeras } from '../../aplicacion/dto/chequera.dto.js';
import type { ConsultasChequeras } from '../../aplicacion/puertos/consultas-chequeras.js';
import { mapeadorDeChequera } from './chequera.mapeador.js';
import { chequeras } from './chequeras.tablas.js';
import { cheques } from './cheques.tablas.js';
import { cuentasBancarias } from './cuentas-bancarias.tablas.js';

const conteo = (estado: 'disponible' | 'emitido' | 'anulado') =>
  sql<number>`count(*) filter (where ${cheques.estado} = ${estado})::int`;

const columnas = {
  ...getTableColumns(chequeras),
  cuentaBancariaNombre: cuentasBancarias.nombre,
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

  /** Todas las chequeras de la empresa, opcionalmente de una cuenta; por cuenta, serie y desde. */
  async listar({ cuentaBancariaId }: FiltroDeChequeras): Promise<ChequeraDto[]> {
    const filas = await this.consulta()
      .where(cuentaBancariaId ? eq(chequeras.cuentaBancariaId, cuentaBancariaId) : undefined)
      .orderBy(asc(cuentasBancarias.nombre), asc(chequeras.serie), asc(chequeras.desde));
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
      .innerJoin(cuentasBancarias, eq(cuentasBancarias.id, chequeras.cuentaBancariaId))
      .groupBy(chequeras.id, cuentasBancarias.nombre);
  }
}
