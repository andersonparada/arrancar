import { asc, eq, getTableColumns } from 'drizzle-orm';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { BancoDto } from '../../aplicacion/dto/banco.dto.js';
import type { ConsultasBancos } from '../../aplicacion/puertos/consultas-bancos.js';
import { mapeadorDeBanco } from './banco.mapeador.js';
import { bancos } from './bancos.tablas.js';

const columnas = { ...getTableColumns(bancos) };

export class ConsultasBancosDrizzle implements ConsultasBancos {
  async listar(): Promise<BancoDto[]> {
    const filas = await this.consulta().orderBy(asc(bancos.nombre));
    return filas.map(mapeadorDeBanco.aDto);
  }

  async obtener(bancoId: string): Promise<BancoDto> {
    const [fila] = await this.consulta().where(eq(bancos.id, bancoId));
    if (!fila) throw new RecursoNoEncontrado('El banco');
    return mapeadorDeBanco.aDto(fila);
  }

  private consulta() {
    return transaccionEnCurso().select(columnas).from(bancos);
  }
}
