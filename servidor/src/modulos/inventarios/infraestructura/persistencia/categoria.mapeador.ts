import { Identificador } from '../../../core/compartido/dominio/identificador.js';
import type { CategoriaDto } from '../../aplicacion/dto/categoria.dto.js';
import { Categoria } from '../../dominio/categoria.js';
import type { categorias } from './categorias.tablas.js';

type Fila = typeof categorias.$inferSelect;

/** Traduce entre la fila de la tabla, la entidad y lo que ve la pantalla. */
export const mapeadorDeCategoria = {
  aEntidad({ id, empresaId, creadoEn, actualizadoEn, creadoPor, actualizadoPor, ...campos }: Fila): Categoria {
    return Categoria.reconstruir({
      ...campos,
      id: Identificador.desde(id),
      empresaId: Identificador.desde(empresaId),
    });
  },

  aFila(categoria: Categoria): typeof categorias.$inferInsert {
    const { id, empresaId, ...datos } = categoria.instantanea();
    return { ...datos, id: id.valor, empresaId: empresaId.valor };
  },

  aDto({ empresaId, creadoEn, actualizadoEn, creadoPor, actualizadoPor, ...dto }: Fila): CategoriaDto {
    return dto;
  },
};
