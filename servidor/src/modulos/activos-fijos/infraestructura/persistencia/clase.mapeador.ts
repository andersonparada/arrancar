import { Identificador } from '../../../core/compartido/dominio/identificador.js';
import type { ClaseDto } from '../../aplicacion/dto/clase.dto.js';
import { Clase } from '../../dominio/clase.js';
import type { clases } from './clases.tablas.js';

type Fila = typeof clases.$inferSelect;

/** Traduce entre la fila de la tabla, la entidad y lo que ve la pantalla. */
export const mapeadorDeClase = {
  aEntidad({ id, empresaId, creadoEn, actualizadoEn, creadoPor, actualizadoPor, ...campos }: Fila): Clase {
    return Clase.reconstruir({
      ...campos,
      id: Identificador.desde(id),
      empresaId: Identificador.desde(empresaId),
    });
  },

  aFila(clase: Clase): typeof clases.$inferInsert {
    const { id, empresaId, ...datos } = clase.instantanea();
    return { ...datos, id: id.valor, empresaId: empresaId.valor };
  },

  aDto({ empresaId, creadoEn, actualizadoEn, creadoPor, actualizadoPor, ...dto }: Fila): ClaseDto {
    return dto;
  },
};
