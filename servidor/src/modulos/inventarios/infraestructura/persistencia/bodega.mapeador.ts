import { Identificador } from '../../../core/compartido/dominio/identificador.js';
import type { BodegaDto } from '../../aplicacion/dto/bodega.dto.js';
import { Bodega } from '../../dominio/bodega.js';
import type { bodegas } from './bodegas.tablas.js';

type Fila = typeof bodegas.$inferSelect;

/** Traduce entre la fila de la tabla, la entidad y lo que ve la pantalla. */
export const mapeadorDeBodega = {
  aEntidad({ id, empresaId, creadoEn, actualizadoEn, creadoPor, actualizadoPor, ...campos }: Fila): Bodega {
    return Bodega.reconstruir({
      ...campos,
      id: Identificador.desde(id),
      empresaId: Identificador.desde(empresaId),
    });
  },

  aFila(bodega: Bodega): typeof bodegas.$inferInsert {
    const { id, empresaId, ...datos } = bodega.instantanea();
    return { ...datos, id: id.valor, empresaId: empresaId.valor };
  },

  aDto({
    empresaId,
    creadoEn,
    actualizadoEn,
    creadoPor,
    actualizadoPor,
    ...dto
  }: Fila & Pick<BodegaDto, 'localidadNombre'>): BodegaDto {
    return dto;
  },
};
