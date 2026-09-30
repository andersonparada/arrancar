import { asc, eq, getTableColumns } from 'drizzle-orm';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { CombustibleDto } from '../../aplicacion/dto/combustible.dto.js';
import type { ConsultasCombustibles } from '../../aplicacion/puertos/consultas-combustibles.js';
import { mapeadorDeCombustible } from './combustible.mapeador.js';
import { combustibles } from './combustibles.tablas.js';

const columnas = { ...getTableColumns(combustibles) };

export class ConsultasCombustiblesDrizzle implements ConsultasCombustibles {
  async listar(): Promise<CombustibleDto[]> {
    const filas = await this.consulta().orderBy(asc(combustibles.nombre));
    return filas.map(mapeadorDeCombustible.aDto);
  }

  async obtener(combustibleId: string): Promise<CombustibleDto> {
    const [fila] = await this.consulta().where(eq(combustibles.id, combustibleId));
    if (!fila) throw new RecursoNoEncontrado('El combustible');
    return mapeadorDeCombustible.aDto(fila);
  }

  private consulta() {
    return transaccionEnCurso().select(columnas).from(combustibles);
  }
}
