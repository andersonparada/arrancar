import { asc, eq, getTableColumns } from 'drizzle-orm';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { TipoDeParcelaDto } from '../../aplicacion/dto/tipo-de-parcela.dto.js';
import type { ConsultasTiposDeParcela } from '../../aplicacion/puertos/consultas-tipos-de-parcela.js';
import { mapeadorDeTipoDeParcela } from './tipo-de-parcela.mapeador.js';
import { tiposDeParcela } from './tipos-de-parcela.tablas.js';

const columnas = { ...getTableColumns(tiposDeParcela) };

export class ConsultasTiposDeParcelaDrizzle implements ConsultasTiposDeParcela {
  async listar(): Promise<TipoDeParcelaDto[]> {
    const filas = await this.consulta().orderBy(asc(tiposDeParcela.nombre));
    return filas.map(mapeadorDeTipoDeParcela.aDto);
  }

  async obtener(tipoDeParcelaId: string): Promise<TipoDeParcelaDto> {
    const [fila] = await this.consulta().where(eq(tiposDeParcela.id, tipoDeParcelaId));
    if (!fila) throw new RecursoNoEncontrado('El tipo de parcela');
    return mapeadorDeTipoDeParcela.aDto(fila);
  }

  private consulta() {
    return transaccionEnCurso().select(columnas).from(tiposDeParcela);
  }
}
