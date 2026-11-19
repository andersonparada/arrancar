import { asc, eq, getTableColumns } from 'drizzle-orm';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { ClaseDto } from '../../aplicacion/dto/clase.dto.js';
import type { ConsultasClases } from '../../aplicacion/puertos/consultas-clases.js';
import { mapeadorDeClase } from './clase.mapeador.js';
import { clases } from './clases.tablas.js';

const columnas = { ...getTableColumns(clases) };

export class ConsultasClasesDrizzle implements ConsultasClases {
  async listar(): Promise<ClaseDto[]> {
    const filas = await this.consulta().orderBy(asc(clases.nombre));
    return filas.map(mapeadorDeClase.aDto);
  }

  async obtener(claseId: string): Promise<ClaseDto> {
    const [fila] = await this.consulta().where(eq(clases.id, claseId));
    if (!fila) throw new RecursoNoEncontrado('La clase de activo');
    return mapeadorDeClase.aDto(fila);
  }

  private consulta() {
    return transaccionEnCurso().select(columnas).from(clases);
  }
}
