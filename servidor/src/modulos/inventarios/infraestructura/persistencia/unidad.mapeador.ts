import { Identificador } from '../../../core/compartido/dominio/identificador.js';
import type { UnidadDto } from '../../aplicacion/dto/unidad.dto.js';
import { Unidad } from '../../dominio/unidad.js';
import type { unidades } from './unidades.tablas.js';

type Fila = typeof unidades.$inferSelect;

/** Traduce entre la fila de la tabla, la entidad y lo que ve la pantalla. */
export const mapeadorDeUnidad = {
  aEntidad({ id, empresaId, creadoEn, actualizadoEn, creadoPor, actualizadoPor, ...campos }: Fila): Unidad {
    return Unidad.reconstruir({
      ...campos,
      id: Identificador.desde(id),
      empresaId: Identificador.desde(empresaId),
    });
  },

  aFila(unidad: Unidad): typeof unidades.$inferInsert {
    const { id, empresaId, ...datos } = unidad.instantanea();
    return { ...datos, id: id.valor, empresaId: empresaId.valor };
  },

  aDto({ empresaId, creadoEn, actualizadoEn, creadoPor, actualizadoPor, ...dto }: Fila): UnidadDto {
    return dto;
  },
};
