import { Identificador } from '../../../core/compartido/dominio/identificador.js';
import type { ArticuloDto } from '../../aplicacion/dto/articulo.dto.js';
import { Articulo } from '../../dominio/articulo.js';
import type { articulos } from './articulos.tablas.js';

type Fila = typeof articulos.$inferSelect;

/** Traduce entre la fila de la tabla, la entidad y lo que ve la pantalla. */
export const mapeadorDeArticulo = {
  aEntidad({ id, empresaId, creadoEn, actualizadoEn, creadoPor, actualizadoPor, ...campos }: Fila): Articulo {
    return Articulo.reconstruir({
      ...campos,
      id: Identificador.desde(id),
      empresaId: Identificador.desde(empresaId),
    });
  },

  aFila(articulo: Articulo): typeof articulos.$inferInsert {
    const { id, empresaId, ...datos } = articulo.instantanea();
    return { ...datos, id: id.valor, empresaId: empresaId.valor };
  },

  aDto({
    empresaId,
    creadoEn,
    actualizadoEn,
    creadoPor,
    actualizadoPor,
    ...dto
  }: Fila & Pick<ArticuloDto, 'categoriaNombre' | 'unidadBaseNombre' | 'conceptoDeGastoNombre'>): ArticuloDto {
    return dto;
  },
};
