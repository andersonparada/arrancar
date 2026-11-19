import { asc, eq, getTableColumns } from 'drizzle-orm';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { CategoriaDto } from '../../aplicacion/dto/categoria.dto.js';
import type { ConsultasCategorias } from '../../aplicacion/puertos/consultas-categorias.js';
import { mapeadorDeCategoria } from './categoria.mapeador.js';
import { categorias } from './categorias.tablas.js';

const columnas = { ...getTableColumns(categorias) };

export class ConsultasCategoriasDrizzle implements ConsultasCategorias {
  async listar(): Promise<CategoriaDto[]> {
    const filas = await this.consulta().orderBy(asc(categorias.nombre));
    return filas.map(mapeadorDeCategoria.aDto);
  }

  async obtener(categoriaId: string): Promise<CategoriaDto> {
    const [fila] = await this.consulta().where(eq(categorias.id, categoriaId));
    if (!fila) throw new RecursoNoEncontrado('La categoría');
    return mapeadorDeCategoria.aDto(fila);
  }

  private consulta() {
    return transaccionEnCurso().select(columnas).from(categorias);
  }
}
