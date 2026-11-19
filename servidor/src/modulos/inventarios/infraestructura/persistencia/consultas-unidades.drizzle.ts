import { asc, eq, getTableColumns } from 'drizzle-orm';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { UnidadDto } from '../../aplicacion/dto/unidad.dto.js';
import type { ConsultasUnidades } from '../../aplicacion/puertos/consultas-unidades.js';
import { mapeadorDeUnidad } from './unidad.mapeador.js';
import { unidades } from './unidades.tablas.js';

const columnas = { ...getTableColumns(unidades) };

export class ConsultasUnidadesDrizzle implements ConsultasUnidades {
  async listar(): Promise<UnidadDto[]> {
    const filas = await this.consulta().orderBy(asc(unidades.nombre));
    return filas.map(mapeadorDeUnidad.aDto);
  }

  async obtener(unidadId: string): Promise<UnidadDto> {
    const [fila] = await this.consulta().where(eq(unidades.id, unidadId));
    if (!fila) throw new RecursoNoEncontrado('La unidad de medida');
    return mapeadorDeUnidad.aDto(fila);
  }

  private consulta() {
    return transaccionEnCurso().select(columnas).from(unidades);
  }
}
